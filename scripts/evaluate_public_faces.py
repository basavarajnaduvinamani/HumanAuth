"""Fixed LCC transfer subset: shipped MiniFASNet pipeline and compact comparator."""
import hashlib
import json
import os
import platform
import sys
from datetime import datetime,timezone
from pathlib import Path
import time
import numpy as np
from PIL import Image
from sklearn.metrics import roc_auc_score,roc_curve
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from gateway.config import Config
from gateway.checks.face import FaceLivenessCheck
from gateway.checks.base import import_from_path
import onnxruntime as ort
dest=ROOT/'.overnight/datasets/lcc';selected=json.loads((dest/'selection.json').read_text())
assert len(selected)==200
assert all((dest/Path(r['id']).name).stat().st_size==r['bytes'] for r in selected)
cfg=Config();baseline=FaceLivenessCheck(cfg);baseline.ensure_loaded()
modern_dir=ROOT/'.overnight/modern';modern_path=modern_dir/'best_model.onnx'
modern=ort.InferenceSession(str(modern_path),providers=['CPUExecutionProvider']) if modern_path.exists() else None
prep=import_from_path('humanauth_comparator_preprocess',modern_dir/'preprocess.py') if modern else None
rows=[]
for i,row in enumerate(selected):
    path=dest/Path(row['id']).name;rgb=np.asarray(Image.open(path).convert('RGB'))
    r=baseline.run(rgb);assert r.status=='ok'
    scores={'shipped':r.score};times={'shipped':r.latency_ms}
    if modern:
        start=time.perf_counter();boxes=baseline.detector([rgb],max_detection=2)[0]
        if len(boxes)!=1:score=0.0
        else:
            crop=prep.crop(rgb,tuple(boxes[0,:4].astype(int)),1.5)
            logits=modern.run(None,{modern.get_inputs()[0].name:prep.preprocess(crop,128)[None]})[0][0]
            p=np.exp(logits-logits.max());score=float(p[0]/p.sum())
        scores['modern_comparator']=score;times['modern_comparator']=(time.perf_counter()-start)*1000
    rows.append(dict(id=row['id'],live=int(row['label']=='real'),scores=scores,latency_ms=times,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),faces=r.extra.get('faces')))
    if (i+1)%25==0:print('Scored',i+1,flush=True)

def metrics(y,s):
    attack=y==0;live=y==1
    apcer=float(np.mean(s[attack]>=.5));bpcer=float(np.mean(s[live]<.5))
    fpr,tpr,_=roc_curve(y,s);fnr=1-tpr;j=int(np.argmin(abs(fpr-fnr)))
    return dict(APCER=apcer,BPCER=bpcer,ACER=(apcer+bpcer)/2,AUC=float(roc_auc_score(y,s)),EER=float((fpr[j]+fnr[j])/2))
y=np.array([r['live'] for r in rows]);outputs={}
for model in rows[0]['scores']:
    scores=np.array([r['scores'][model] for r in rows]);point=metrics(y,scores);rng=np.random.default_rng(20261101);samples={k:[] for k in point}
    for _ in range(2000):
        ids=np.concatenate([rng.choice(np.flatnonzero(y==label),int((y==label).sum()),replace=True) for label in (0,1)])
        for k,v in metrics(y[ids],scores[ids]).items():samples[k].append(v)
    ci={k:[float(v) for v in np.percentile(values,[2.5,97.5])] for k,values in samples.items()}
    outputs[model]=dict(metrics=point,ci95=ci,latency_ms={p:float(np.percentile([r['latency_ms'][model] for r in rows],q)) for p,q in [('p50',50),('p95',95)]})
out=dict(generated_at=datetime.now(timezone.utc).isoformat(),command='python scripts/evaluate_public_faces.py',dataset=dict(name='LCC-FASD fixed balanced evaluation subset',version='faber24/lcc-fasd version 1',official_source='https://pureportal.spbu.ru/files/51584200/CSIT2019_Grishkin_Timoshenko.pdf',mirror='https://www.kaggle.com/datasets/faber24/lcc-fasd',terms='Scientific research use described by the original authors; Kaggle mirror licence is Unknown. Evaluation only; images not redistributed.'),protocol='bench/protocol_2026.md',seed=20261101,sample_count=len(rows),class_counts={'bona_fide':100,'attack':100},sample_ids_sha256=hashlib.sha256('\n'.join(sorted(r['id'] for r in rows)).encode()).hexdigest(),sample_content_sha256=hashlib.sha256('\n'.join(sorted(r['sha256'] for r in rows)).encode()).hexdigest(),threshold=.5,bootstrap={'replicates':2000,'unit':'stratified images, identity mapping unavailable in evaluation filenames','method':'percentile'},scope='Cross-domain transfer: upstream shipped model describes CelebA-Spoof training. Fixed balanced subset, not full LCC evaluation. Repeated images/identities can make image bootstrap intervals too narrow; no subject-disjoint or population claim. Detector failures remain rejection.',outputs=outputs,model_hashes={'detector':hashlib.sha256(cfg.face_detector_path.read_bytes()).hexdigest(),'shipped':hashlib.sha256(cfg.antispoof_path.read_bytes()).hexdigest(),**({'modern_comparator':hashlib.sha256(modern_path.read_bytes()).hexdigest()} if modern else {})},modern_comparison={'source':'https://github.com/facenox/face-antispoof-onnx','checkpoint':'models/best/98.20/best_model.onnx','licence':'Apache-2.0 upstream','preprocess':'upstream src/inference/preprocess.py: reflected expansion 1.5, AREA reduction / LANCZOS4 enlargement, reflected letterbox, RGB CHW /255','detector_control':'same shipped detector and face-count rule for both models','decision':'Keep shipped model: no replacement without browser parity, irrespective of transfer result.'},no_face_or_multiple=sum(r['faces']!=1 for r in rows),hardware={'cpu':'12th Gen Intel(R) Core(TM) i5-12450H','cpu_source':'.finish/hardware.json','logical_cores':os.cpu_count(),'ram_bytes':16831889408,'os':platform.platform(),'python':platform.python_version(),'onnxruntime':ort.__version__})
target=ROOT/'bench/results/face_public_2026';target.with_suffix('.json').write_text(json.dumps(out,indent=2)+'\n')
md=['# Public face transfer evaluation','',out['scope'],'',f"Samples: {len(rows)}; balanced 100 bona fide / 100 attacks. IDs SHA-256: {out['sample_ids_sha256']}",'','| Model | Metric | Value | Bootstrap 95% CI |','| --- | --- | ---: | --- |']
for name,values in outputs.items():
    for k,v in values['metrics'].items():md.append(f"| {name} | {k} | {v} | {values['ci95'][k]} |")
md+=['','Intervals: stratified image bootstrap, 2000 replicates, seed 20261101. Identity dependence is not accounted for.','APCER = attack acceptance; BPCER = bona fide rejection; ACER = their mean. EER uses closest ROC crossing, descriptive only.','Full detector, face-count rejection and expanded crops are included. Same detector controls the model comparison.','No model replacement without browser parity. Source and terms are in the JSON.']
target.with_suffix('.md').write_text('\n'.join(md)+'\n');print(json.dumps(out,indent=2))
