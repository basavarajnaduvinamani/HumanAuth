"""Losslessly encode ignored reference fixtures for browser-decoder qualification."""
import json
import wave
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
dest=ROOT/'.overnight/parity'
for r in json.loads((dest/'references.json').read_text())['rows']:
    raw=(dest/r['file']).read_bytes()
    if r['modality']=='voice':
        with wave.open(str(dest/(r['id']+'.wav')),'wb') as f:
            f.setnchannels(r['channels']);f.setsampwidth(2);f.setframerate(r['rate']);f.writeframes(raw)
    else:
        Image.frombytes('RGB',(r['width'],r['height']),raw).save(dest/(r['id']+'.png'))
print('Encoded browser fixtures without changing reference pixels or samples.')
