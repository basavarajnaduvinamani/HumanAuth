// Synthetic speech fixture generation. Never accepts or reads a human recording.
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { WASI } from "node:wasi";

const root = fileURLToPath(new URL("../../", import.meta.url));
const model = await WebAssembly.compile(gunzipSync(await readFile(
  path.join(root, "web/public/models/flite-synthesis.wasm.gz"))));

export async function synthesize(text, voice) {
  if (!["slt", "rms"].includes(voice)) throw Error("Unknown synthetic preset");
  const dir = await mkdtemp(path.join(tmpdir(), "humanauth-synthetic-"));
  try {
    const wasi = new WASI({
      version: "preview1", args: ["flite", "-voice", voice, text, "speech.wav"],
      env: {}, preopens: { ".": dir }, returnOnExit: true,
    });
    const instance = await WebAssembly.instantiate(model, {
      wasi_snapshot_preview1: wasi.wasiImport,
    });
    const code = wasi.start(instance);
    if (code !== 0) throw Error(`Synthetic TTS failed (${code})`);
    return await readFile(path.join(dir, "speech.wav"));
  } finally {
    // This directory is created by this function and holds generated data only.
    if (path.dirname(path.resolve(dir)) !== path.resolve(tmpdir()) ||
        !path.basename(dir).startsWith("humanauth-synthetic-"))
      throw Error("Refusing cleanup outside the synthetic temporary directory");
    await rm(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [, , voice, text, output] = process.argv;
  await writeFile(output, await synthesize(text, voice));
}
