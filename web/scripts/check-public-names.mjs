// This guard is build tooling, never included in the visitor's JS bundle.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const patterns = [
  ["former contributor", /\bPushpa(?:\s+Priya)?\b/iu],
  ["former contributor", /\bThriveni\b/iu],
  ["former contributor or personal fixture", /\bSahana\b/iu],
  ["retired personal fixture", /\bRaj\b/iu],
  ["guide", /\b(?:Navya|Damodar)\b/iu],
  ["original certificate credit", /\bGirisha?\b/iu],
  ["original certificate credit", /\bUday[\s_-]*Kumar(?:\s+Reddy)?\b/iu],
];
export function nameViolations(text) {
  const normalized = text
    .replace(/\\u([a-f0-9]{4})/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/\\[nrt]|&nbsp;/g, " ")
    .replace(/&#(x[\da-f]+|\d+);/gi, (value, n) => {
      const code = n[0].toLowerCase() === "x" ? parseInt(n.slice(1), 16) : Number(n);
      return code <= 0x10ffff ? String.fromCodePoint(code) : value;
    });
  return patterns.filter(([, pattern]) => pattern.test(normalized)).map(([label]) => label);
}
async function files(root) {
  const out = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...await files(full));
    else if (/\.(?:html|json|js|mjs|map|css|txt|rsc|meta|svg)$/i.test(full)) out.push(full);
  }
  return out;
}
async function main() {
  const root = fileURLToPath(new URL("../", import.meta.url));
  await readFile(path.join(root, ".next/BUILD_ID"));
  const inputs = (await Promise.all([".next/server", ".next/static", "public"].map(
    (folder) => files(path.join(root, folder)),
  ))).flat();
  const failures = [];
  for (const file of inputs) {
    if (nameViolations(await readFile(file, "utf8")).length)
      failures.push(path.relative(root, file));
  }
  if (failures.length) throw Error("Public-name guard failed:\n" + failures.join("\n"));
  console.log(`Public-name guard passed: ${inputs.length} built/public text files.`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  await main();
