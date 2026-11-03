import { it, expect } from "vitest";
import { encode } from "fast-png";
import { decodeImage } from "./decode-image";
it("preserves RGB pixels and drops alpha without compositing in worker PNG decode", async () => {
  const data = new Uint8Array(32 * 32 * 4);
  for (let i = 0; i < 32 * 32; i++) {
    data.set([20, 100, 220, 0], i * 4);
  }
  const encoded = encode({ width: 32, height: 32, data, channels: 4 });
  const bytes = new Uint8Array(encoded).buffer;
  const image = await decodeImage(bytes);
  expect(Array.from(image.data.slice(0, 6))).toEqual([
    20, 100, 220, 20, 100, 220,
  ]);
});
it("rejects unsupported bytes and oversized image headers", async () => {
  await expect(decodeImage(new Uint8Array([1, 2, 3]).buffer)).rejects.toThrow(
    "Unsupported image type",
  );
  const bytes = new ArrayBuffer(24),
    u = new Uint8Array(bytes),
    d = new DataView(bytes);
  u.set([137, 80]);
  d.setUint32(16, 5000);
  d.setUint32(20, 32);
  await expect(decodeImage(bytes)).rejects.toThrow("dimensions");
});
