import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const manifest = JSON.parse(await readFile("public/models/manifest.json", "utf8"));
assert.ok(manifest.total_bytes < 60_000_000, "Visitor model artifacts must remain below 60 MB");
for (const model of manifest.models) {
  const bytes = await readFile(`public/models/${model.file}`);
  assert.equal(bytes.length, model.size_bytes, `${model.file}: size mismatch`);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), model.sha256,
    `${model.file}: digest mismatch`);
}
console.log(`Verified ${manifest.models.length} release assets against the model manifest.`);
