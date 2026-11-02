"""Controlled source-disjoint SIDTD field/whole comparison; aggregate outputs only.

Run after downloading the authors' templates.zip into ignored research storage.
Test is not used for model/threshold selection. Source media are never extracted.
"""
import argparse
import hashlib
import io
import json
import os
import platform
import sys
import time
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import balanced_accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from bench.document_v2_data import bounded_records, load_records
from gateway.checks.document import DocumentCheck
from gateway.config import Config

SEED = 20261103


def metrics(labels, scores, threshold):
    predictions = np.asarray(scores) >= threshold
    return dict(roc_auc=float(roc_auc_score(labels,scores)),
                forged_precision=float(precision_score(labels,predictions,zero_division=0)),
                forged_recall=float(recall_score(labels,predictions,zero_division=0)))


def calibrate(labels,scores):
    # Include both all-positive and all-negative operating points.
    candidates=np.unique(np.r_[0.,scores,np.nextafter(1.,2.)])
    return float(max(candidates,key=lambda t:(balanced_accuracy_score(labels,scores>=t),t)))


def clustered_ci(rows,labels,scores,threshold,replicates=2000):
    rng=np.random.default_rng(SEED)
    sources=sorted({r['source'] for r in rows})
    indices={s:np.array([i for i,r in enumerate(rows) if r['source']==s]) for s in sources}
    values={k:[] for k in metrics(labels,scores,threshold)}
    for _ in range(replicates):
        chosen=np.concatenate([indices[s] for s in rng.choice(sources,len(sources),replace=True)])
        if len(np.unique(labels[chosen]))!=2:
            continue
        for k,v in metrics(labels[chosen],scores[chosen],threshold).items():values[k].append(v)
    return {k:np.percentile(v,[2.5,97.5]).tolist() for k,v in values.items()}


def paired_auc_difference(rows,labels,candidate,baseline,replicates=2000):
    rng=np.random.default_rng(SEED)
    sources=sorted({r['source'] for r in rows})
    indices={s:np.array([i for i,r in enumerate(rows) if r['source']==s]) for s in sources}
    values=[]
    for _ in range(replicates):
        chosen=np.concatenate([indices[s] for s in rng.choice(sources,len(sources),replace=True)])
        if len(np.unique(labels[chosen]))==2:
            values.append(roc_auc_score(labels[chosen],candidate[chosen])-roc_auc_score(labels[chosen],baseline[chosen]))
    return dict(difference=float(roc_auc_score(labels,candidate)-roc_auc_score(labels,baseline)),ci95=np.percentile(values,[2.5,97.5]).tolist())


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive',default='.overnight/datasets/sidtd/templates.zip')
    parser.add_argument('--models',nargs='+',choices=['shipped','mobilenet','dinov2'],default=['shipped','mobilenet','dinov2'])
    args=parser.parse_args()
    torch.manual_seed(SEED);np.random.seed(SEED);torch.set_num_threads(2)
    archive_path=ROOT/args.archive
    archive_sha=hashlib.file_digest(archive_path.open('rb'),'sha256').hexdigest()
    local=ROOT/'.overnight/document-v2';local.mkdir(exist_ok=True)
    with zipfile.ZipFile(archive_path) as archive:
        all_rows,rejected,splits=load_records(archive)
        rows=bounded_records(all_rows)
        assert rows, 'No unambiguously annotated paired fields'
        training=ROOT/'modules/document_forgery_detection/src/data/id_dataset/train/images'
        training_hashes={hashlib.sha256(p.read_bytes()).hexdigest() for p in training.glob('*') if p.is_file()}
        blobs={p:archive.read(p) for p in {r['path'] for r in rows}}
        hashes={p:hashlib.sha256(b).hexdigest() for p,b in blobs.items()}
        assert not (set(hashes.values())&training_hashes),'Overlap with original training bytes'
        for a,b in [('train','dev'),('train','test'),('dev','test')]:
            assert not ({r['source'] for r in rows if r['split']==a}&{r['source'] for r in rows if r['split']==b})
            assert not ({hashes[r['path']] for r in rows if r['split']==a}&{hashes[r['path']] for r in rows if r['split']==b})
        for r in rows:
            with Image.open(io.BytesIO(blobs[r['path']])) as im:
                x1,y1,x2,y2=r['box']
                assert 0<=x1<x2<=im.width and 0<=y1<y2<=im.height,'Annotation outside image'
        (local/'manifest.json').write_text(json.dumps(dict(rows=rows,rejected=rejected,splits=splits,hashes=hashes),indent=2))
        summary=dict(generated_at=datetime.now(timezone.utc).isoformat(),command=' '.join(sys.argv),
                     protocol='bench/protocol_v2_document.md',seed=SEED,
                     dataset=dict(name='SIDTD templates',url='https://datasets.cvc.uab.es/SIDTD/templates.zip',
                                  archive_sha256=archive_sha,archive_bytes=archive_path.stat().st_size,
                                  licence='Repository CC BY 4.0; TC11 landing page CC BY-SA 3.0 discrepancy, local research only, no redistribution'),
                     sample_ids_sha256=hashlib.sha256('\n'.join(sorted(r['id'] for r in rows)).encode()).hexdigest(),
                     sample_content_sha256=hashlib.sha256('\n'.join(sorted(set(hashes.values()))).encode()).hexdigest(),
                     counts={split:dict(regions=sum(r['split']==split for r in rows),
                                        unique_images=len({r['path'] for r in rows if r['split']==split}),
                                        sources=len({r['source'] for r in rows if r['split']==split}),
                                        classes=dict(Counter(str(r['label']) for r in rows if r['split']==split)),
                                        templates=sorted(k for k,v in splits.items() if v==split)) for split in ['train','dev','test']},
                     excluded_annotations=dict(Counter(r['reason'] for r in rejected)),zero_training_byte_overlap=True,
                     hardware=dict(cpu=platform.processor(),logical_cores=os.cpu_count(),torch_threads=2,
                                   os=platform.platform(),python=platform.python_version(),torch=torch.__version__),
                     bootstrap=dict(replicates=2000,seed=SEED,unit='original document source clusters within the fixed held-out template subset',method='percentile'),
                     scope='Bounded SIDTD source/template-disjoint paired field study. Whole-image scores repeat per annotated field for paired comparison; unique-image counts are explicit. Not a full benchmark or real-ID result.',results={})
        labels=np.array([r['label'] for r in rows]);dev=np.array([i for i,r in enumerate(rows) if r['split']=='dev']);test=np.array([i for i,r in enumerate(rows) if r['split']=='test']);train=np.array([i for i,r in enumerate(rows) if r['split']=='train'])
        for subset in [train,dev,test]:assert len(np.unique(labels[subset]))==2
        test_scores={}
        for name in args.models:
            if name=='shipped':
                check=DocumentCheck(Config());check.ensure_loaded();model=check.model;transform=check.transform
                model_sha=hashlib.sha256(Config().document_model_path.read_bytes()).hexdigest()
            else:
                import timm
                from timm.data import resolve_model_data_config,create_transform
                model_id='mobilenetv3_small_100.lamb_in1k' if name=='mobilenet' else 'vit_small_patch14_dinov2.lvd142m'
                model=timm.create_model(model_id,pretrained=True,num_classes=0,
                                        **({'img_size':224} if name=='dinov2' else {})).eval()
                config=resolve_model_data_config(model)
                # Equal input area; interpolation and ImageNet normalisation from pinned pretrained config.
                config['input_size']=(3,224,224)
                transform=create_transform(**config,is_training=False)
                digest=hashlib.sha256()
                for key,value in sorted(model.state_dict().items()):digest.update(key.encode());digest.update(value.cpu().contiguous().numpy().tobytes())
                model_sha=digest.hexdigest()
                summary.setdefault('candidates',{})[name]=dict(model_id=model_id,timm=timm.__version__,preprocessing=config,training='frozen encoder; L2 logistic head, dev-selected regularisation',licence='Apache-2.0 per exact model card',source_url='https://huggingface.co/timm/'+model_id,pretrained_config=model.pretrained_cfg)
            for view in ['whole','annotated-field']:
                outputs=[];cache={};start=time.perf_counter()
                for i,r in enumerate(rows):
                    key=(r['path'],tuple(r['box']) if view=='annotated-field' else ())
                    if key not in cache:
                        im=Image.open(io.BytesIO(blobs[r['path']])).convert('RGB')
                        if view=='annotated-field':im=im.crop(r['box'])
                        with torch.inference_mode():value=model(transform(im).unsqueeze(0))
                        cache[key]=value[0].cpu().numpy()
                    outputs.append(cache[key])
                    if (i+1)%250==0:print(name,view,i+1,'/',len(rows),flush=True)
                features=np.stack(outputs)
                if name=='shipped':scores=torch.softmax(torch.from_numpy(features),dim=1)[:,0].numpy();fit=None
                else:
                    best=None
                    for c in [.01,.1,1.,10.]:
                        classifier=make_pipeline(StandardScaler(),LogisticRegression(C=c,max_iter=1000,random_state=SEED))
                        classifier.fit(features[train],labels[train]);auc=roc_auc_score(labels[dev],classifier.predict_proba(features[dev])[:,1])
                        if best is None or auc>best[0]:best=(auc,c,classifier)
                    _,c,classifier=best;scores=classifier.predict_proba(features)[:,1];fit=dict(C=c,dev_auc=float(best[0]))
                    # This checkpoint has no source media or person embeddings; keep it local until release qualification.
                    np.savez(local/f'{name}-{view}-head.npz',coef=classifier[-1].coef_,intercept=classifier[-1].intercept_,mean=classifier[0].mean_,scale=classifier[0].scale_)
                threshold=calibrate(labels[dev],scores[dev])
                key=f'{name}/{view}'
                summary['results'][key]=dict(model_sha256=model_sha,fit=fit,threshold=threshold,threshold_source='dev balanced accuracy, tie higher threshold',
                                             historical_threshold=dict(value=.5,metrics=metrics(labels[test],scores[test],.5),ci95=clustered_ci([rows[i] for i in test],labels[test],scores[test],.5)),
                                             calibrated=dict(metrics=metrics(labels[test],scores[test],threshold),ci95=clustered_ci([rows[i] for i in test],labels[test],scores[test],threshold)),
                                             elapsed_seconds=time.perf_counter()-start)
                np.savez(local/f'{name}-{view}-scores.npz',scores=scores)
                test_scores[key]=scores[test]
                target=ROOT/'bench/results/document_v2_2026.json';target.write_text(json.dumps(summary,indent=2)+'\n')
                print(key,summary['results'][key]['calibrated'],flush=True)
        test_rows=[rows[i] for i in test]
        summary['paired_auc_comparisons']={}
        for key,scores in test_scores.items():
            baseline='shipped/'+key.split('/')[1]
            if not key.startswith('shipped/') and baseline in test_scores:
                summary['paired_auc_comparisons'][key+' minus '+baseline]=paired_auc_difference(test_rows,labels[test],scores,test_scores[baseline])
        if 'shipped/whole' in test_scores and 'shipped/annotated-field' in test_scores:
            summary['paired_auc_comparisons']['shipped annotated-field minus whole']=paired_auc_difference(test_rows,labels[test],test_scores['shipped/annotated-field'],test_scores['shipped/whole'])
        summary['status']='completed requested model comparisons; not browser-qualified'
        target.write_text(json.dumps(summary,indent=2)+'\n')
        md=['# SIDTD document comparison','',summary['scope'],'','Protocol: bench/protocol_v2_document.md. Data, splits, hashes and uncertainty in document_v2_2026.json.','', '| Model / view | Dev threshold | Test AUC (95% CI) | Forged precision | Forged recall |','|---|---:|---|---:|---:|']
        for key,value in summary['results'].items():
            m=value['calibrated']['metrics'];ci=value['calibrated']['ci95']['roc_auc']
            md.append(f"| {key} | {value['threshold']} | {m['roc_auc']} [{ci[0]}, {ci[1]}] | {m['forged_precision']} | {m['forged_recall']} |")
        md+=['','No result here establishes public-demo licence permission, browser parity, total download size or a population KYC operating point. No automatic model release.','']
        target.with_suffix('.md').write_text('\n'.join(md),encoding='utf-8')


if __name__=='__main__':main()
