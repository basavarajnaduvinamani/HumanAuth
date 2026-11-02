import { WASI, File as MemoryFile, OpenFile, PreopenDirectory, ConsoleStdout } from "@bjorn3/browser_wasi_shim";

export const sampleSpeakers = ["Sample speaker A", "Sample speaker B"] as const;
export type SampleSpeaker = typeof sampleSpeakers[number];
export const samplePhrases = [
  "This is a synthetic sample phrase for local testing.",
  "My registration stays on this device for this demonstration.",
  "The next check uses a different sentence from the first one.",
  "I am checking the local sample at the service counter.",
] as const;

// The synthesizer writes only to this short-lived in-memory filesystem. There is
// no host filesystem, recording, upload, IndexedDB or Cache Storage access here.
export async function synthesizeSpeech(
  compressedModel: ArrayBuffer,
  speaker: SampleSpeaker,
  phrase: number,
): Promise<ArrayBuffer> {
  if (!sampleSpeakers.includes(speaker) || !Number.isInteger(phrase) || phrase < 0 || phrase >= samplePhrases.length)
    throw Error("Unknown synthetic sample selection.");
  const decoded = await new Response(
    new Blob([compressedModel]).stream().pipeThrough(new DecompressionStream("gzip")),
  ).arrayBuffer();
  const compiled = await WebAssembly.compile(decoded);
  const output = new MemoryFile(new Uint8Array());
  const wasi = new WASI(
    ["flite", "-voice", speaker === sampleSpeakers[0] ? "slt" : "rms", samplePhrases[phrase], "speech.wav"],
    [],
    [new OpenFile(new MemoryFile(new Uint8Array())),
      ConsoleStdout.lineBuffered(() => undefined),
      ConsoleStdout.lineBuffered(() => undefined),
      new PreopenDirectory(".", new Map([["speech.wav", output]]))],
  );
  const instance = await WebAssembly.instantiate(compiled, { wasi_snapshot_preview1: wasi.wasiImport });
  const memory = instance.exports.memory;
  const start = instance.exports._start;
  if (!(memory instanceof WebAssembly.Memory) || typeof start !== "function")
    throw Error("Synthetic speech runtime is invalid.");
  const code = wasi.start({ exports: { memory, _start: () => start() } });
  if (code !== 0 || output.data.length < 44)
    throw Error("Synthetic sample generation failed. Please retry.");
  return Uint8Array.from(output.data).buffer;
}
