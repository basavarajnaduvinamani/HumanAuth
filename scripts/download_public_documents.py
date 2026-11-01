"""Fetch public research archives into ignored storage; verify the record checksums."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
from pathlib import Path
import urllib.request
import http.client

ROOT=Path(__file__).resolve().parents[1]
dest=ROOT/'.overnight/datasets/cactus'
dest.mkdir(parents=True,exist_ok=True)
record=json.load(urllib.request.urlopen('https://zenodo.org/api/records/8213348',timeout=60))
assert record['metadata']['license']['id']=='cc-by-4.0'
(dest/'record.json').write_text(json.dumps(record,indent=2),encoding='utf8')
def download(f):
    target=dest/f['key']
    offset=target.stat().st_size if target.exists() else 0
    while offset<f['size']:
        end=min(offset+4*1024*1024,f['size'])-1
        request=urllib.request.Request(f['links']['self'],headers={'Range':f'bytes={offset}-{end}'})
        with urllib.request.urlopen(request,timeout=60) as src:
            assert src.status==206
            assert src.headers['Content-Range'].startswith(f'bytes {offset}-')
            try:
                data=src.read()
            except http.client.IncompleteRead as exc:
                data=exc.partial
        assert 0<len(data)<=end-offset+1, (target,len(data),end-offset+1)
        with target.open('ab') as out:out.write(data)
        offset+=len(data)
        print(target.name,offset,'/',f['size'],flush=True)
    actual=hashlib.md5(target.read_bytes()).hexdigest()
    assert 'md5:'+actual==f['checksum'], (target,actual)
    print(target.name,target.stat().st_size,actual,flush=True)
with ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(download,record['files']))
