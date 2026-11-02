import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { expect, it } from "vitest";
import { synthesizeSpeech } from "./synthetic-speech";

it("matches native Node WASI speech byte for byte for both synthetic presets", async () => {
  const bytes = Uint8Array.from(await readFile("public/models/flite-synthesis.wasm.gz")).buffer;
  // Independent native WASI references, same pinned Flite artifact and phrase 0.
  // These are generated speech digests, never recordings or personal templates.
  const references = [
    ["Sample speaker A", "af1e468c8d053bf681b00d116a9d23610ee55456c19ff7f9c036aa9fd0fb6411"],
    ["Sample speaker B", "f9698e7f0999e9765335886fd8754d557daedc6c2c428178c387219ae68275db"],
  ] as const;
  for (const [speaker, sha] of references) {
    const audio = await synthesizeSpeech(bytes, speaker, 0);
    expect(createHash("sha256").update(new Uint8Array(audio)).digest("hex")).toBe(sha);
    expect(new TextDecoder().decode(audio.slice(0, 4))).toBe("RIFF");
    expect(new DataView(audio).getUint32(24, true)).toBe(16000);
  }
}, 30000);

it("rejects selections outside the fixed sample phrase list before synthesis", async () => {
  await expect(synthesizeSpeech(new ArrayBuffer(0), "Sample speaker A", -1))
    .rejects.toThrow("Unknown synthetic sample selection");
});
