import { CheckResult, Modality } from "./types";
import { WorkerRequest, WorkerResponse } from "./worker-messages";
let worker: Worker | null = null,
  id = 0;
export function wipeInference() {
  worker?.terminate();
  worker = null;
}
export function infer(
  name: Modality,
  bytes: ArrayBuffer,
  claimed: string,
  onProgress: (m: Extract<WorkerResponse, { type: "progress" }>) => void,
  synthetic?: WorkerRequest["synthetic"],
): Promise<CheckResult> {
  if (typeof Worker === "undefined")
    throw Error(
      "This browser does not support inference workers. Try an updated browser.",
    );
  if (!worker)
    worker = new Worker(
      new URL("../workers/inference.worker.ts", import.meta.url),
      { type: "module" },
    );
  const current = worker,
    requestId = ++id;
  return new Promise((resolve, reject) => {
    const finish = () => {
      clearTimeout(timeout);
      current.removeEventListener("message", handler);
      current.removeEventListener("error", error);
    };
    const error = () => {
      finish();
      reject(
        Error(
          "This browser could not start the inference worker. Try an updated browser.",
        ),
      );
    };
    const handler = (event: MessageEvent<WorkerResponse>) => {
      const m = event.data;
      if (m.id !== requestId) return;
      if (m.type === "progress") onProgress(m);
      else {
        finish();
        if (m.type === "result") resolve(m.result);
        else reject(Error(m.message));
      }
    };
    const timeout = setTimeout(() => {
      finish();
      reject(
        Error(
          "Model processing timed out. Retry on a faster connection or device.",
        ),
      );
    }, 600000);
    current.addEventListener("message", handler);
    current.addEventListener("error", error);
    current.postMessage(
      { id: requestId, name, bytes, claimed, synthetic } satisfies WorkerRequest,
      [bytes],
    );
  });
}
