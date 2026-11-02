import { mkdir, copyFile, readdir, unlink } from "node:fs/promises";
await mkdir("public/runtime", { recursive: true });
await mkdir("public/licenses", { recursive: true });
await copyFile("../licenses/flite-COPYING.txt", "public/licenses/flite-COPYING.txt");
// The pinned webgpu entry uses Asyncify. Legacy JSEP and plain WASM builds
// are not fetched by this entry point, and would duplicate the runtime payload.
for (const file of await readdir("public/runtime"))
  if (file.startsWith("ort-wasm-")) await unlink(`public/runtime/${file}`);
for (const file of await readdir("node_modules/onnxruntime-web/dist"))
  if (/^ort-wasm-simd-threaded\.asyncify\.(wasm|mjs)$/.test(file))
    await copyFile(
      `node_modules/onnxruntime-web/dist/${file}`,
      `public/runtime/${file}`,
    );
