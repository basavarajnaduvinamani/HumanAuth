"""Rebuild synthetic-only migration fixtures; never reads personal recordings."""
import hashlib
import io
import json
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))
from gateway.checks.voice import extract_features, to_enrollment_format
from gateway.validation import load_wav
from gateway.config import Config

PHRASES = [
    "This is a synthetic sample phrase for local testing.",
    "My registration stays on this device for this demonstration.",
    "The next check uses a different sentence from the first one.",
    "I am checking the local sample at the service counter.",
]
PARAMETERS = dict(sampleRate=44100, stereo=True,
    flatten='numpy.append preemphasis flattens stereo in C order',
    winlen=0.025, winstep=0.01, numcep=20, nfilt=26, nfft=1103,
    lowfreq=0, highfreq=22050, preemph=0.97, ceplifter=22, appendEnergy=True,
    window='ones', dct='II ortho', scale='per-column population std', delta_N=2)

def node_executable():
    local = ROOT / 'web/node_modules/node/bin/node.exe'
    return str(local) if local.exists() else shutil.which('node')

def synthetic_wav(speaker=0, phrase=0):
    if speaker not in (0, 1) or phrase not in range(len(PHRASES)):
        raise ValueError('Invalid synthetic sample selection')
    dest = ROOT / '.overnight/synthetic-fixtures'
    dest.mkdir(parents=True, exist_ok=True)
    target = dest / f'sample-{speaker}-{phrase}.wav'
    if not target.exists():
        node = node_executable()
        if not node:
            raise RuntimeError('Node 24 is required to generate synthetic fixtures; no recording fallback is allowed')
        subprocess.run([node, str(ROOT/'scripts/synthetic/synthesize.mjs'),
            ('slt', 'rms')[speaker], PHRASES[phrase], str(target)], check=True)
    return target.read_bytes()

def main():
    import python_speech_features as psf
    from sklearn.mixture import GaussianMixture
    speakers = {}
    for speaker in range(2):
        frames = []
        for phrase in range(3):
            rate, samples = load_wav('voice', synthetic_wav(speaker, phrase), Config())
            frames.append(extract_features(to_enrollment_format(rate, samples), 44100, psf))
        g = GaussianMixture(n_components=16, covariance_type='diag', random_state=20261102,
                            n_init=2, reg_covar=1e-6, max_iter=200).fit(np.vstack(frames))
        speakers[f'Sample speaker {"AB"[speaker]}'] = dict(weights=g.weights_.tolist(),
            means=g.means_.tolist(), covariances=g.covariances_.tolist(), covariance_type='diag')
    result = dict(schema_version=1, synthetic_only=True,
        purpose='Synthetic fixture compatibility only; not visitor speaker verification or held-out accuracy',
        generator=dict(package='@echogarden/flite-wasi', version='0.1.1',
            license='Flite permissive CMU/BSD-like collection; full COPYING in licenses/flite-COPYING.txt',
            source='https://github.com/echogarden-project/flite-wasi',
            model_sha256=hashlib.sha256((ROOT/'web/public/models/flite-synthesis.wasm.gz').read_bytes()).hexdigest(),
            phrases=PHRASES, seed=20261102),
        parameters=PARAMETERS, speakers=speakers)
    dest = ROOT/'bench/fixtures/synthetic_voice'
    dest.mkdir(parents=True, exist_ok=True)
    (dest/'reference.json').write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8', newline='\n')
    print('Created synthetic fixture parameters for Sample speaker A and Sample speaker B.')

if __name__ == '__main__': main()
