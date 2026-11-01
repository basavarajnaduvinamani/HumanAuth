import {mkdir,copyFile,readdir} from 'node:fs/promises';
await mkdir('public/runtime',{recursive:true});
for(const file of await readdir('node_modules/onnxruntime-web/dist'))if(/^ort-wasm-simd-threaded\.(jsep\.)?(wasm|mjs)$/.test(file))await copyFile(`node_modules/onnxruntime-web/dist/${file}`,`public/runtime/${file}`);
