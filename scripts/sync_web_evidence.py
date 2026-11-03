"""Copy compact, sourced aggregate evidence into the self-contained web root."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sources={'face':'bench/results/face_public_2026.json','document':'bench/results/document_public_2026.json','browser_parity':'bench/results/web_browser_parity.json','latency':'bench/results/web_latency_latest.json','network':'bench/results/web_network_audit.json','slow_network':'bench/results/web_slow_network.json'}
out={}
for name,source in sources.items():
    p=ROOT/source
    if p.exists():
        body=json.loads(p.read_text(encoding='utf8'))
        # Avoid duplicating raw run arrays in the static page data.
        for k in ['warm','cold','rows','requests']:body.pop(k,None)
        out[name]={'source':source,'data':body}
    else:out[name]=None
dest=ROOT/'web/src/data';dest.mkdir(parents=True,exist_ok=True)
(dest/'evidence.json').write_text(json.dumps(out,indent=2)+'\n',encoding='utf8')
print('Synchronized available aggregate evidence:',', '.join(n for n,v in out.items() if v))
