"""Enumerate original LCC evaluation filenames and fetch a fixed balanced subset."""
import hashlib
import json
from pathlib import Path
import urllib.request
import urllib.parse
import zipfile
import io
from concurrent.futures import ThreadPoolExecutor
ROOT=Path(__file__).resolve().parents[1]
dest=ROOT/'.overnight/datasets/lcc'
dest.mkdir(parents=True,exist_ok=True)
all_files=[];token='';page=0
while True:
    cache=dest/f'page-{page}.json'
    if cache.exists():d=json.loads(cache.read_text(encoding='utf8'))
    else:
        url='https://www.kaggle.com/api/v1/datasets/list/faber24/lcc-fasd?'+urllib.parse.urlencode({'pageToken':token,'pageSize':1000})
        d=json.load(urllib.request.urlopen(url,timeout=30));cache.write_text(json.dumps(d),encoding='utf8')
    files=d.get('datasetFiles',[])
    all_files.extend(f for f in files if '/LCC_FASD_evaluation/' in f['name'])
    print('page',page,'evaluation files',len(all_files),flush=True)
    if all_files and any('/LCC_FASD_training/' in f['name'] for f in files):break
    token=d.get('nextPageToken') or ''
    if not token:break
    page+=1
all_files=list({f['name']:f for f in all_files}.values())
assert len(all_files)==7580, len(all_files)
selected=[]
for label in ('real','spoof'):
    files=[f for f in all_files if Path(f['name']).name.startswith(label)]
    files.sort(key=lambda f:hashlib.sha256(('20261101'+f['name']).encode()).hexdigest())
    selected.extend(dict(id=f['name'],label=label,bytes=f['totalBytes']) for f in files[:100])
assert len(selected)==200
(dest/'selection.json').write_text(json.dumps(selected,indent=2),encoding='utf8')
def download(row):
    target=dest/Path(row['id']).name
    if not target.exists():
        url='https://www.kaggle.com/api/v1/datasets/download/faber24/lcc-fasd/'+urllib.parse.quote(row['id'],safe='')
        blob=urllib.request.urlopen(url,timeout=60).read()
        if blob.startswith(b'PK'):
            with zipfile.ZipFile(io.BytesIO(blob)) as archive:
                matching=[n for n in archive.namelist() if Path(n).name==target.name]
                assert len(matching)==1
                blob=archive.read(matching[0])
        assert blob.startswith(b'\x89PNG') or blob.startswith(b'\xff\xd8'), (row['id'],len(blob),blob[:120])
        assert len(blob)==row['bytes'],(row['id'],len(blob),row['bytes'])
        target.write_bytes(blob)
    print(target.name,target.stat().st_size,flush=True)
with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(download,selected))

