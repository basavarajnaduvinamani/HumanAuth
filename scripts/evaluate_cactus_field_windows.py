"""Exploratory same-300-document crop diagnostic with exact source provenance.

Original field annotations are not manipulated-region masks. Document labels
are never assigned to individual fields; their scores are averaged first.
"""
import hashlib
import io
import json
import os
import platform
import sys
import time
import zipfile
from collections import Counter
from datetime import datetime,timezone
from pathlib import Path
import numpy as np
import torch
from PIL import Image
from sklearn.metrics import roc_auc_score,precision_score,recall_score

ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT))
from gateway.config import Config
from gateway.checks.document import DocumentCheck


def metrics(y,s):
    return dict(roc_auc=float(roc_auc_score(y,s)),forged_precision=float(precision_score(y,s>.5,zero_division=0)),forged_recall=float(recall_score(y,s>.5,zero_division=0)))


def main():
    torch.set_num_threads(2)
    data=ROOT/'.overnight/datasets/cactus';sidtd=ROOT/'.overnight/datasets/sidtd/templates.zip'
    record=json.loads((data/'record.json').read_text(encoding='utf-8'))
    for f in record['files']:
        assert 'md5:'+hashlib.md5((data/f['key']).read_bytes()).hexdigest()==f['checksum']
    check=DocumentCheck(Config());check.ensure_loaded()
    rows=[];seen=set();start=time.perf_counter()
    with zipfile.ZipFile(sidtd) as annotated,zipfile.ZipFile(data/'original.zip') as genuine:
        ann_bytes=annotated.read('templates/Annotations/reals/esp_id.json');ann=json.loads(ann_bytes)
        by_name={r['filename']:r for r in ann['_via_img_metadata'].values()}
        matches=0
        for n in genuine.namelist():
            if n.lower().endswith('.jpg'):
                assert genuine.read(n)==annotated.read('templates/Images/reals/esp_id_'+n),'Source identity mismatch'
                matches+=1
        for name in ['original.zip','esp_id_edited_120.zip','esp_id_edited_140.zip']:
            with zipfile.ZipFile(data/name) as z:
                for n in sorted(z.namelist()):
                    if not n.lower().endswith(('.jpg','.jpeg','.png')):continue
                    blob=z.read(n);digest=hashlib.sha256(blob).hexdigest()
                    if digest in seen:continue
                    seen.add(digest)
                    im=Image.open(io.BytesIO(blob)).convert('RGB')
                    with Image.open(io.BytesIO(genuine.read(n))) as original:assert im.size==original.size,'Edited dimensions differ'
                    crops=[]
                    for region in by_name[n]['regions']:
                        r=region['shape_attributes'];assert r['name']=='rect','Non-rectangular field requires separate handling'
                        x,y,w,h=[int(r[k]) for k in ['x','y','width','height']]
                        assert min(x,y)>=0 and min(w,h)>=2 and x+w<=im.width and y+h<=im.height
                        crops.append(check.transform(im.crop((x,y,x+w,y+h))))
                    assert crops
                    with torch.inference_mode():scores=torch.softmax(check.model(torch.stack(crops)),dim=1)[:,0].cpu().numpy()
                    whole=1-check.run(np.array(im)).score
                    rows.append(dict(id=name+'/'+n,source=Path(n).stem,label=int(name!='original.zip'),field_count=len(crops),field_score=float(scores.mean()),whole_score=whole))
                    if len(rows)%50==0:print('Scored',len(rows),'documents',flush=True)
    assert len(rows)==300 and matches==100
    labels=np.array([r['label'] for r in rows]);field=np.array([r['field_score'] for r in rows]);whole=np.array([r['whole_score'] for r in rows])
    groups=sorted({r['source'] for r in rows});indices={g:np.array([i for i,r in enumerate(rows) if r['source']==g]) for g in groups}
    rng=np.random.default_rng(20261101);samples={mode:{k:[] for k in metrics(labels,field)} for mode in ['whole','field_mean']};deltas=[]
    for _ in range(2000):
        chosen=np.concatenate([indices[g] for g in rng.choice(groups,len(groups),replace=True)])
        a=metrics(labels[chosen],field[chosen]);b=metrics(labels[chosen],whole[chosen]);deltas.append(a['roc_auc']-b['roc_auc'])
        for mode,point in [('whole',b),('field_mean',a)]:
            for k,v in point.items():samples[mode][k].append(v)
    out=dict(generated_at=datetime.now(timezone.utc).isoformat(),command='python scripts/evaluate_cactus_field_windows.py',protocol='bench/protocol_v2_document.md, same-source amendment',
             dataset=dict(name=record['metadata']['title'],version='1.0',doi=record['doi'],licence='CC-BY-4.0',archive_checksums={f['key']:f['checksum'] for f in record['files']}),
             annotations=dict(source='https://datasets.cvc.uab.es/SIDTD/templates.zip',path='templates/Annotations/reals/esp_id.json',sha256=hashlib.sha256(ann_bytes).hexdigest(),verified_byte_identical_originals=matches,scope='Original MIDV field windows; not edited-field manipulation masks'),
             sample_count=len(rows),source_groups=len(groups),field_count_distribution=dict(Counter(str(r['field_count']) for r in rows)),
             sample_ids_sha256=hashlib.sha256('\n'.join(sorted(r['id'] for r in rows)).encode()).hexdigest(),sample_content_sha256=hashlib.sha256('\n'.join(sorted(seen)).encode()).hexdigest(),
             model_sha256=hashlib.sha256(Config().document_model_path.read_bytes()).hexdigest(),threshold=.5,
             aggregation='Mean forged probability over every original annotated rectangular field; equal weights; no field selection',
             results={mode:dict(metrics=metrics(labels,score),ci95={k:np.percentile(v,[2.5,97.5]).tolist() for k,v in samples[mode].items()}) for mode,score in [('whole',whole),('field_mean',field)]},
             paired_auc_difference=dict(value=float(roc_auc_score(labels,field)-roc_auc_score(labels,whole)),ci95=np.percentile(deltas,[2.5,97.5]).tolist()),
             bootstrap=dict(seed=20261101,replicates=2000,unit='original document filename cluster',method='percentile'),
             hardware=dict(cpu=platform.processor(),logical_cores=os.cpu_count(),torch_threads=2,os=platform.platform(),python=platform.python_version(),torch=torch.__version__),elapsed_seconds=time.perf_counter()-start,
             scope='Exploratory same-case field-window diagnostic. Previously seen CACTUS cases, not a new held-out selection set. Original windows may miss expanded edited text. Aggregation differs from whole-image scoring. No causality, exact forgery-localisation or real-ID validity claim.')
    target=ROOT/'bench/results/document_cactus_field_windows_v2_2026.json';target.write_text(json.dumps(out,indent=2)+'\n')
    md=['# CACTUS same-source field-window diagnostic','',out['scope'],'','| Input | AUC | 95% CI |','|---|---:|---|']
    for mode,r in out['results'].items():md.append(f"| {mode} | {r['metrics']['roc_auc']} | {r['ci95']['roc_auc']} |")
    md+=['',f"Paired AUC difference: {out['paired_auc_difference']}",'','All 100 original files matched the annotated MIDV/SIDTD sources byte for byte. See JSON for hashes, fields, threshold, bootstrap, command and hardware.','']
    target.with_suffix('.md').write_text('\n'.join(md));print(json.dumps(out,indent=2))


if __name__=='__main__':main()
