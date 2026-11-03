"""Aggregate official MIDV polygons versus the exact browser TS candidate."""
import hashlib
import json
import platform
from collections import Counter
from datetime import datetime,timezone
from pathlib import Path
import cv2
import numpy as np

ROOT=Path(__file__).resolve().parents[1]


def condition(number):
    if number<20:return 'projective distortion'
    if number<30:return 'text background'
    if number<40:return 'keyboard background'
    if number<50:return 'outdoors'
    if number<60:return 'table background'
    if number<70:return 'highlight'
    if number<90:return 'low lighting'
    return 'cloth background'


def measures(rows):
    scores=np.array([r['iou'] for r in rows])
    return dict(coverage=float(np.mean([r['detected'] for r in rows])),mean_iou=float(scores.mean()),median_iou=float(np.median(scores)),iou_at_least_05=float(np.mean(scores>=.5)),iou_at_least_08=float(np.mean(scores>=.8)))


def main():
    base=ROOT/'.overnight/datasets/midv2020/bounded'
    manifest=json.loads((base/'manifest.json').read_text());run=json.loads((base/'localization-output.json').read_text());annotations={}
    for path in base.glob('*.json'):
        if path.name in ['manifest.json','localization-output.json']:continue
        obj=json.loads(path.read_text());annotations[path.stem]={r['filename']:r for r in obj['_via_img_metadata'].values()}
    rows=[]
    for r in run['rows']:
        template,filename=r['id'].split('/')
        regions=[v['shape_attributes'] for v in annotations[template][filename]['regions'] if v['region_attributes'].get('field_name')=='doc_quad']
        assert len(regions)==1 and regions[0]['name']=='polygon'
        shape=regions[0];truth=np.array(list(zip(shape['all_points_x'],shape['all_points_y'])),dtype=np.float32)
        assert len(truth)==4 and cv2.isContourConvex(truth)
        frame=np.array([[0,0],[r['width']-1,0],[r['width']-1,r['height']-1],[0,r['height']-1]],dtype=np.float32)
        _,clipped=cv2.intersectConvexConvex(truth,frame);assert clipped is not None
        truth_area=cv2.contourArea(clipped);iou=0.
        if r['quad']:
            prediction=np.array([[p['x'],p['y']] for p in r['quad']],dtype=np.float32)
            intersection,_=cv2.intersectConvexConvex(prediction,clipped)
            union=cv2.contourArea(prediction)+truth_area-intersection
            assert union>0;iou=float(intersection/union)
        rows.append(dict(id=r['id'],template=template,condition=condition(int(Path(filename).stem)),iou=iou,detected=r['quad'] is not None,out_of_frame=bool((truth[:,0]<0).any() or (truth[:,1]<0).any() or (truth[:,0]>r['width']-1).any() or (truth[:,1]>r['height']-1).any()),localization_ms=r['localization_ms']))
    assert len(rows)==100 and len({r['id'] for r in rows})==100
    templates=sorted({r['template'] for r in rows});rng=np.random.default_rng(20261103);boot={k:[] for k in measures(rows)}
    grouped={t:[r for r in rows if r['template']==t] for t in templates}
    for _ in range(2000):
        chosen=[]
        for t in rng.choice(templates,len(templates),replace=True):
            group=grouped[t];chosen.extend(group[i] for i in rng.integers(0,len(group),len(group)))
        for k,v in measures(chosen).items():boot[k].append(v)
    source=ROOT/'web/src/lib/document-localization.ts'
    hardware=json.loads((ROOT/'.finish/hardware.json').read_text())
    out=dict(generated_at=datetime.now(timezone.utc).isoformat(),command='cd web && npx tsx ../scripts/evaluate_document_localization.ts; python scripts/summarize_document_localization.py',
             protocol='bench/protocol_v2_localization.md',seed=20261103,dataset=dict(name='MIDV-2020 photo bounded subset',url=manifest['source'],licence='CC-BY-SA-2.5',licence_url='ftp://smartengines.com/midv-2020/license.txt',selection=manifest['selection'],whole_archive_hash_verified=False),
             sample_count=100,templates=len(templates),sample_ids_sha256=hashlib.sha256('\n'.join(sorted(r['id'] for r in rows)).encode()).hexdigest(),sample_content_sha256=hashlib.sha256('\n'.join(sorted(r['sha256'] for r in manifest['records'])).encode()).hexdigest(),
             annotation_hashes={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in base.glob('*.json') if p.stem in templates},algorithm_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),method='Exact TypeScript browser candidate, Otsu/components/convex hull/quad; no learned weights',
             metrics=measures(rows),ci95={k:np.percentile(v,[2.5,97.5]).tolist() for k,v in boot.items()},bootstrap=dict(replicates=2000,seed=20261103,unit='templates then captures within each sampled template',method='percentile'),
             by_template={t:dict(n=len(grouped[t]),**measures(grouped[t])) for t in templates},by_condition={c:dict(n=sum(r['condition']==c for r in rows),**measures([r for r in rows if r['condition']==c])) for c in sorted({r['condition'] for r in rows})},
             out_of_frame_annotations=sum(r['out_of_frame'] for r in rows),hardware=dict(cpu=hardware['cpu'][0]['Name'],ram_bytes=hardware['ram_bytes'],os=platform.platform(),node=run['node'],python=platform.python_version(),opencv=cv2.__version__),
             timing=dict(scope='Node localisation only, excludes JPEG decode and all model inference; not browser/device camera latency',p50_ms=float(np.percentile([r['localization_ms'] for r in rows],50)),p95_ms=float(np.percentile([r['localization_ms'] for r in rows],95))),
             scope='Fixed first ten stored photos per template. Archive order is not a random population sample. Missed/ambiguous detection is zero IoU. Geometry does not establish authenticity or physical-device performance. No tuning after these scores.')
    target=ROOT/'bench/results/document_localization_v2_2026.json';target.write_text(json.dumps(out,indent=2)+'\n')
    md=['# Classical card localisation — bounded MIDV-2020 study','',out['scope'],'','| Metric | Value | 95% CI |','|---|---:|---|']
    for k,v in out['metrics'].items():md.append(f"| {k} | {v} | {out['ci95'][k]} |")
    md+=['','100 captures, ten templates. Selection, annotation hashes, algorithm hash, conditions, failures and hardware are in document_localization_v2_2026.json.','']
    target.with_suffix('.md').write_text('\n'.join(md),encoding='utf-8');print(json.dumps(out['metrics'],indent=2))


if __name__=='__main__':main()
