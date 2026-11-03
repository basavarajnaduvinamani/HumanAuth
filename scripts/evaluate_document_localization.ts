/** Run from web/ with pinned tsx. Pixels/output remain ignored, aggregates only. */
import sharp from "../web/node_modules/sharp";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, sep } from "node:path";
import { locateCard } from "../web/src/lib/document-localization";

async function main() {
  const root = resolve(".."),
    base = resolve(root, ".overnight/datasets/midv2020/bounded");
  const manifest = JSON.parse(
    await readFile(resolve(base, "manifest.json"), "utf8"),
  );
  if (manifest.records.length !== 100)
    throw new Error("Expected fixed 100-capture manifest");
  const rows = [];
  for (const record of manifest.records) {
    const path = resolve(root, record.path);
    if (!path.startsWith(base + sep))
      throw new Error("Input path outside bounded research directory");
    const input = await readFile(path);
    if (createHash("sha256").update(input).digest("hex") !== record.sha256)
      throw new Error("Source member hash mismatch");
    const { data, info } = await sharp(input)
    .autoOrient()
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = {
      width: info.width,
      height: info.height,
      data: new Uint8ClampedArray(
        data.buffer,
        data.byteOffset,
        data.byteLength,
      ),
    };
    const start = performance.now();
    const found = locateCard(pixels);
    rows.push({
      id: record.id,
      width: info.width,
      height: info.height,
      quad: found?.quad || null,
      localization_ms: performance.now() - start,
    });
    if (rows.length % 10 === 0)
      process.stdout.write(`Localized ${rows.length}/100\n`);
  }
  await writeFile(
    resolve(base, "localization-output.json"),
    JSON.stringify(
      { generated_at: new Date().toISOString(), node: process.version, rows },
      null,
      2,
    ) + "\n",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
