"""Generate non-persistent raw fixtures and Python references for complete pipelines."""
import io
import json
import platform
import sys
import wave
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from bench.latency import sample_inputs
from gateway.config import Config
from gateway.checks.face import FaceLivenessCheck
from gateway.checks.document import DocumentCheck
from gateway.checks.voice import VoiceCheck
from gateway.validation import load_wav

dest=ROOT/'.overnight/parity-v2'
dest.mkdir(parents=True,exist_ok=True)
samples=sample_inputs()
cfg=Config()
checks={'face':FaceLivenessCheck(cfg),'document':DocumentCheck(cfg),'voice':VoiceCheck(cfg)}
rows=[]
for modality,blob in zip(checks,samples):
    if modality!='voice':
        base=Image.open(io.BytesIO(blob)).convert('RGB')
        for i in range(11):
            im=base.copy()
            if i:
                im=im.resize((max(32,round(base.width*(0.55+0.06*i))),max(32,round(base.height*(0.55+0.06*i)))))
                im=ImageEnhance.Brightness(im).enhance(0.6+0.08*i)
                buf=io.BytesIO();im.save(buf,'JPEG',quality=40+5*i);im=Image.open(io.BytesIO(buf.getvalue())).convert('RGB')
            a=np.asarray(im);name=f'{modality}-{i}';(dest/f'{name}.rgb').write_bytes(a.tobytes())
            # Lossless browser encodings of the exact same reference bytes.
            im.save(dest/f'{name}.png')
            ref=checks[modality].run(a).to_dict()
            rows.append(dict(id=name,modality=modality,width=im.width,height=im.height,file=f'{name}.rgb',python=ref))
    else:
        rate,audio=load_wav('voice',blob,cfg)
        for i in range(11):
            # Audio variants use deterministic gain and temporal trimming (JPEG is inapplicable).
            a=audio if i==0 else np.clip(np.rint(audio[:max(rate,int(len(audio)*(0.75+0.02*i)))]*(0.55+0.04*i)),-32768,32767).astype(np.int16)
            name=f'voice-{i}';(dest/f'{name}.pcm').write_bytes(a.astype('<i2').tobytes())
            with wave.open(str(dest/f'{name}.wav'), 'wb') as wav:
                wav.setnchannels(1 if a.ndim==1 else a.shape[1])
                wav.setsampwidth(2)
                wav.setframerate(rate)
                wav.writeframes(a.astype('<i2').tobytes())
            rows.append(dict(id=name,modality=modality,file=f'{name}.pcm',rate=rate,channels=1 if a.ndim==1 else a.shape[1],python=checks[modality].run((rate,a,'Sample speaker A')).to_dict()))
(dest/'references.json').write_text(json.dumps(dict(generated_at=datetime.now(timezone.utc).isoformat(),python=platform.python_version(),rows=rows),indent=2))
print('Prepared',len(rows),'reference cases; raw fixtures remain ignored.')
