import * as ort from "onnxruntime-web/webgpu";
import manifest from "../../public/models/manifest.json";
import { checkImage, Runner } from "../lib/inference";
import { checkVoice, decodeWav, VoiceModels } from "../lib/voice";
import { CheckResult } from "../lib/types";
import { decodeImage } from "../lib/decode-image";
import { WorkerRequest, WorkerResponse } from "../lib/worker-messages";
ort.env.wasm.wasmPaths = "/runtime/";
ort.env.wasm.numThreads = self.crossOriginIsolated
  ? Math.min(4, self.navigator.hardwareConcurrency || 1)
  : 1;
ort.env.telemetryEnabled = false;
const sessions = new Map<
  string,
  { session: ort.InferenceSession; backend: string }
>();
let gpuAvailable: Promise<boolean> | null = null;
function usableGPU(): Promise<boolean> {
  if (!gpuAvailable)
    gpuAvailable = (async () => {
      const nav = self.navigator as WorkerNavigator & {
        gpu?: { requestAdapter(): Promise<unknown> };
      };
      if (!nav.gpu) return false;
      try {
        return Boolean(
          await Promise.race([
            nav.gpu.requestAdapter(),
            new Promise<null>((resolve) =>
              setTimeout(() => resolve(null), 1000),
            ),
          ]),
        );
      } catch {
        return false;
      }
    })();
  return gpuAvailable;
}
const emit = (message: WorkerResponse) => self.postMessage(message);
async function asset(file: string, id: number) {
  const entry = manifest.models.find((m) => m.file === file);
  if (!entry) throw Error("Model is missing from the manifest.");
  const key = new URL(
    `/models/${file}?sha256=${entry.sha256}`,
    self.location.origin,
  ).href;
  const cache =
    typeof caches !== "undefined"
      ? await caches.open("humanauth-models-v1")
      : null;
  const hit = await cache?.match(key);
  let bytes: ArrayBuffer;
  if (hit) {
    bytes = await hit.arrayBuffer();
    emit({
      id,
      type: "progress",
      file,
      loaded: bytes.byteLength,
      total: entry.size_bytes,
      cached: true,
    });
  } else {
    let response: Response;
    try {
      response = await fetch(key, { cache: "force-cache" });
    } catch {
      throw Error("Model download failed. Check your connection and retry.");
    }
    if (!response.ok || !response.body)
      throw Error(
        `Model download failed (${response.status}). Retry when connected.`,
      );
    const reader = response.body.getReader(),
      chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      emit({
        id,
        type: "progress",
        file,
        loaded,
        total: entry.size_bytes,
        cached: false,
      });
    }
    const joined = new Uint8Array(loaded);
    let offset = 0;
    for (const c of chunks) {
      joined.set(c, offset);
      offset += c.length;
    }
    bytes = joined.buffer;
  }
  const sha = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (v) => v.toString(16).padStart(2, "0"),
  ).join("");
  if (bytes.byteLength !== entry.size_bytes || sha !== entry.sha256) {
    await cache?.delete(key);
    throw Error("Model integrity check failed. Retry the download.");
  }
  if (!hit)
    try {
      await cache?.put(key, new Response(bytes.slice(0)));
    } catch {
      /* Inference can continue when storage is full or unavailable. */
    }
  return bytes;
}
async function process(request: WorkerRequest) {
  const { id, name, bytes } = request;
  try {
    let backend = "JavaScript CPU";
    const run: Runner = async (file, x, dims) => {
      let saved = sessions.get(file);
      if (!saved) {
        const model = await asset(file, id),
          gpu = await usableGPU();
        if (gpu)
          try {
            saved = {
              session: await ort.InferenceSession.create(model, {
                executionProviders: ["webgpu"],
              }),
              backend: "WebGPU",
            };
          } catch {
            /* Quantized operators may require WASM. */
          }
        if (!saved)
          saved = {
            session: await ort.InferenceSession.create(model, {
              executionProviders: ["wasm"],
            }),
            backend: "WASM",
          };
        sessions.set(file, saved);
      }
      backend = saved.backend;
      const session = saved.session,
        out = await session.run({
          [session.inputNames[0]]: new ort.Tensor("float32", x, dims),
        }),
        t = out[session.outputNames[0]];
      const data = Float32Array.from(t.data as Float32Array);
      for (const value of Object.values(out)) value.dispose();
      return { data, dims: t.dims };
    };
    // Cold stage timing includes download and initialization; warm reuses sessions.
    const started = performance.now();
    let output: CheckResult;
    if (name === "voice") {
      const models = JSON.parse(
          new TextDecoder().decode(await asset("voice-gmm.json", id)),
        ) as VoiceModels,
        audio = decodeWav(bytes);
      output = checkVoice(
        audio.samples,
        audio.rate,
        audio.channels,
        models,
        request.claimed || "Raj",
      );
    } else
      output = await checkImage(
        name,
        await decodeImage(bytes),
        run,
        manifest.document_file,
      );
    output.latency_ms = performance.now() - started;
    output.backend = backend;
    emit({ id, type: "result", result: output });
  } catch (e) {
    emit({
      id,
      type: "error",
      message:
        e instanceof Error
          ? e.message
          : "Inference failed. Try a bundled sample.",
    });
  }
}
let pending = Promise.resolve();
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  pending = pending.then(() => process(event.data));
};
