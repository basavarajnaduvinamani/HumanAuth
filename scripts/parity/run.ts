import {readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import {checkImage,Runner} from '../../web/src/lib/inference';
import {checkVoice} from '../../web/src/lib/voice';
import {CheckResult,Modality} from '../../web/src/lib/types';
async function main() {
const root=path.resolve('..'),require=createRequire(path.join(root,'web/package.json'));
const ort=require('onnxruntime-node') as typeof import('../../web/node_modules/onnxruntime-node');
const refs=JSON.parse(await readFile(path.join(root,'.overnight/parity-v2/references.json'),'utf8')) as {rows:{id:string;modality:Modality;file:string;width:number;height:number;rate:number;channels:number;python:CheckResult}[]};
const dir=path.join(root,'web/public/models');
const models=JSON.parse(await readFile(path.join(dir,'synthetic-voice-reference.json'),'utf8'));
const sessions=new Map<string,InstanceType<typeof ort.InferenceSession>>();
const run:Runner=async(file,x,dims)=>{let session=sessions.get(file);if(!session){session=await ort.InferenceSession.create(path.isAbsolute(file)?file:path.join(dir,file),{executionProviders:['cpu'],intraOpNumThreads:4});sessions.set(file,session);}const out=await session.run({[session.inputNames[0]]:new ort.Tensor('float32',x,dims)}),v=out[session.outputNames[0]];return {data:v.data as Float32Array,dims:v.dims};};
async function evaluate(docFile:string,onlyDocument=false){const rows=[];
for(const ref of refs.rows){if(onlyDocument&&ref.modality!=='document')continue;const b=await readFile(path.join(root,'.overnight/parity-v2',ref.file));let ts:CheckResult;const start=performance.now();
if(ref.modality==='voice'){const pcm=Float64Array.from({length:b.length/2},(_,i)=>b.readInt16LE(i*2));ts=checkVoice(pcm,ref.rate,ref.channels,models,'Sample speaker A');}
else ts=await checkImage(ref.modality,{data:new Uint8Array(b),width:ref.width,height:ref.height},run,docFile);
rows.push({id:ref.id,modality:ref.modality,python_score:ref.python.score,ts_score:ts.score,abs_diff:Math.abs(ts.score!-ref.python.score!),same_pass_fail:ts.passed===ref.python.passed,python_status:ref.python.status,ts_ms:performance.now()-start,python_result:ref.python,ts_result:ts});}return rows;}
const attempts:Record<string,unknown>={},candidates=['document-int8.onnx','document-fp16.onnx'];let chosen='document-fp32.onnx';
for(const name of candidates){try{const candidate=path.join(root,'.overnight/candidates',name),rows=await evaluate(candidate,true);const max=Math.max(...rows.map(r=>r.abs_diff));attempts[name]={max_abs_diff:max,all_decisions_match:rows.every(r=>r.same_pass_fail)};if(max<=0.02&&rows.every(r=>r.same_pass_fail&&r.python_status==='ok')){chosen=name;await copyFile(candidate,path.join(dir,name));break;}}catch(e){attempts[name]={error:String(e)}}}
const rows=await evaluate(chosen),gate=Object.fromEntries((['face','document','voice'] as const).map(modality=>{const r=rows.filter(x=>x.modality===modality),max=Math.max(...r.map(x=>x.abs_diff)),go=r.length===11&&r.every(x=>x.same_pass_fail&&x.python_status==='ok')&&max<=0.02;return [modality,{mode:go?'GO':'REPLAY',max_abs_diff:max,cases:r.length,all_decisions_match:r.every(x=>x.same_pass_fail),scope:'Node CPU; browser qualification required separately'}]}));
const manifestPath=path.join(dir,'manifest.json'),manifest=JSON.parse(await readFile(manifestPath,'utf8'));
if(chosen!=='document-fp32.onnx'){const entry=manifest.models.find((m:{file:string})=>m.file.startsWith('document-')),b=await readFile(path.join(dir,chosen));entry.file=chosen;entry.size_bytes=b.length;entry.sha256=createHash('sha256').update(b).digest('hex');entry.precision=chosen.includes('int8')?'int8':'fp16';await rm(path.join(dir,'document-fp32.onnx'),{force:true});}
manifest.total_bytes=manifest.models.reduce((s:number,m:{size_bytes:number})=>s+m.size_bytes,0);manifest.document_file=chosen;manifest.parity=gate;manifest.selection_attempts=attempts;
await writeFile(manifestPath,JSON.stringify(manifest,null,2)+'\n');
const output={generated_at:new Date().toISOString(),command:'cd web && npm run parity',hardware:{cpu:os.cpus()[0].model,logical_cores:os.cpus().length,ram_bytes:os.totalmem(),os:`${os.type()} ${os.release()}`,node:process.version,onnxruntime:ort.env.versions},protocol:'AI-generated fictional face and synthetic SPECIMEN: original + 10 resize/JPEG/brightness variants. Flite-generated synthetic speech: original + 10 gain/trimming variants. Not held-out accuracy; no personal recording or enrollment. Reference and TS decode the same RGB/PCM bytes.',gate,attempts,document_file:chosen,total_model_bytes:manifest.total_bytes,rows};
await writeFile(path.join(root,'bench/results/web_parity.json'),JSON.stringify(output,null,2)+'\n');
const md=['# Web parity (Node CPU)','',output.protocol,'','| Check | Mode | Max absolute difference | Cases |','| --- | --- | ---: | ---: |',...Object.entries(gate).map(([n,v])=>`| ${n} | ${v.mode} | ${v.max_abs_diff} | ${v.cases} |`),'','| Input | Python score | TS score | Absolute difference | Same pass/fail |','| --- | ---: | ---: | ---: | --- |',...rows.map(r=>`| ${r.id} | ${r.python_score} | ${r.ts_score} | ${r.abs_diff} | ${r.same_pass_fail?'yes':'no'} |`),'',`Model bytes: ${manifest.total_bytes}. Selected document: ${chosen}.`,'','Browser decode/backend equivalence is qualified separately in browser QA. These results establish implementation parity on fixtures, not detection accuracy.'].join('\n');
await writeFile(path.join(root,'bench/results/web_parity.md'),md+'\n');
const replay=Object.fromEntries((['face','document','voice'] as const).map(n=>[n,rows.find(r=>r.id===`${n}-0`)!.python_result]));
await writeFile(path.join(root,'web/public/samples/replay.json'),JSON.stringify(replay,null,2)+'\n');
console.log(md);
}
main().catch(e=>{console.error(e);process.exitCode=1;});

