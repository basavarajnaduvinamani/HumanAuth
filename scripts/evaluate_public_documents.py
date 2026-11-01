"""Evaluate the fixed gateway document model on the preregistered Zenodo source.

All archives/media stay ignored. Only aggregate results, data hashes and the
protocol are tracked. Never tune the threshold using this output.
"""
import hashlib
import io
import json
import os
import platform
import sys
import time
import zipfile
from datetime import datetime,timezone
from pathlib import Path
import numpy as np
from PIL import Image
from sklearn.metrics import accuracy_score,precision_score,recall_score,roc_auc_score
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from gateway.config import Config
from gateway.checks.document import DocumentCheck

data=ROOT/'.overnight/datasets/cactus'
record=json.loads((data/'record.json').read_text(encoding='utf8'))
assert record['metadata']['license']['id']=='cc-by-4.0'
for f in record['files']:
    assert 'md5:'+hashlib.md5((data/f['key']).read_bytes()).hexdigest()==f['checksum']
cfg=Config();check=DocumentCheck(cfg);check.ensure_loaded()
training=ROOT/'modules/document_forgery_detection/src/data/id_dataset/train/images'
training_hashes={hashlib.sha256(p.read_bytes()).hexdigest() for p in training.glob('*') if p.is_file()}
seen=set();rows=[];rejected=[]
for archive in ('original.zip','esp_id_edited_120.zip','esp_id_edited_140.zip'):
    with zipfile.ZipFile(data/archive) as z:
        for name in sorted(z.namelist()):
            if not name.lower().endswith(('.jpg','.jpeg','.png')):continue
            blob=z.read(name);sha=hashlib.sha256(blob).hexdigest()
            if sha in seen:continue
            assert sha not in training_hashes,'Training image overlap'
            seen.add(sha)
            try:im=np.asarray(Image.open(io.BytesIO(blob)).convert('RGB'))
            except Exception as exc:rejected.append(dict(archive=archive,id=name,error=type(exc).__name__));continue
            r=check.run(im)
            assert r.status=='ok',r
            rows.append(dict(id=archive+'/'+name,group=Path(name).stem,label=int(archive!='original.zip'),forged_score=1-r.score,latency_ms=r.latency_ms,sha256=sha))
            if len(rows)%50==0:print('Scored',len(rows),flush=True)

labels=np.array([r['label'] for r in rows]);scores=np.array([r['forged_score'] for r in rows]);pred=scores>0.5
def metrics(y,s):
    p=s>0.5
    return dict(accuracy=float(accuracy_score(y,p)),forged_precision=float(precision_score(y,p,zero_division=0)),forged_recall=float(recall_score(y,p,zero_division=0)),roc_auc=float(roc_auc_score(y,s)))
point=metrics(labels,scores)
groups=sorted(set(r['group'] for r in rows));indices={g:np.array([i for i,r in enumerate(rows) if r['group']==g]) for g in groups}
rng=np.random.default_rng(20261101);samples={k:[] for k in point}
for _ in range(2000):
    ids=np.concatenate([indices[g] for g in rng.choice(groups,len(groups),replace=True)])
    if len(np.unique(labels[ids]))<2:continue
    for k,v in metrics(labels[ids],scores[ids]).items():samples[k].append(v)
ci={k:[float(v) for v in np.percentile(values,[2.5,97.5])] for k,values in samples.items()}
out=dict(generated_at=datetime.now(timezone.utc).isoformat(),command='python scripts/evaluate_public_documents.py',dataset=dict(name=record['metadata']['title'],version='1.0',doi=record['doi'],url='https://zenodo.org/records/8213348',licence='CC-BY-4.0',archive_checksums={f['key']:f['checksum'] for f in record['files']}),protocol='bench/protocol_2026.md',seed=20261101,sample_count=len(rows),source_groups=len(groups),class_counts={'genuine':int((labels==0).sum()),'forged':int((labels==1).sum())},sample_ids_sha256=hashlib.sha256('\n'.join(sorted(r['id'] for r in rows)).encode()).hexdigest(),sample_content_sha256=hashlib.sha256('\n'.join(sorted(seen)).encode()).hexdigest(),training_byte_overlaps=0,model=str(cfg.document_model_path.relative_to(ROOT)).replace('\\','/'),model_sha256=hashlib.sha256(cfg.document_model_path.read_bytes()).hexdigest(),class_order=list(cfg.document_class_order),threshold=0.5,metrics=point,ci95=ci,bootstrap=dict(replicates=2000,unit='source filename stem, clustering original and both edited versions; filename correspondence assumed from archive naming',method='percentile'),hardware=dict(cpu=platform.processor(),logical_cores=os.cpu_count(),ram_bytes=16831889408,ram_source='.finish/hardware.json',os=platform.platform(),python=platform.python_version(),torch=check.torch.__version__),scope='Whole-image cross-domain transfer to synthetic Spanish IDs, not a population KYC or fraud benchmark. No fitting on this source. Byte disjointness checked; same source filename groups cluster edits. Region-crop evaluation unavailable: archive supplies no validated forgery-region boxes.',region_crop={'status':'skipped','reason':'No validated manipulated-region annotations; inventing boxes would change the protocol.'},rejected_inputs=rejected,latency_ms={'p50':float(np.percentile([r['latency_ms'] for r in rows],50)),'p95':float(np.percentile([r['latency_ms'] for r in rows],95))})
target=ROOT/'bench/results/document_public_2026'
target.with_suffix('.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf8')
md=['# Public document transfer evaluation','',out['scope'],'',f"Dataset: {out['dataset']['name']}, v1.0, CC-BY-4.0, DOI {record['doi']}.",f"Samples: {len(rows)}; source groups: {len(groups)}; IDs SHA-256: {out['sample_ids_sha256']}",'','| Metric | Value | Bootstrap 95% CI |','| --- | ---: | --- |',*[f'| {k} | {v} | [{ci[k][0]}, {ci[k][1]}] |' for k,v in point.items()],'','Model: '+out['model'],'Command: '+out['command'],'Protocol: bench/protocol_2026.md. Seed 20261101; 2000 cluster bootstrap replicates.','No region-crop result: validated manipulated-region annotations are absent.']
target.with_suffix('.md').write_text('\n'.join(md)+'\n',encoding='utf8')
print(json.dumps(out,indent=2))
