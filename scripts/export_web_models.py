"""Reproduce web assets from tracked checkpoints; never inspect private assets.

Run: python scripts/export_web_models.py
Requires the full gateway environment plus onnx, onnxconverter-common.
Quantized/fp16 candidates stay outside public/ until the parity gate selects one.
"""
import hashlib
import json
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from gateway.config import Config
from gateway.checks.document import DocumentCheck
from gateway.checks.voice import _RestrictedUnpickler


def main():
    import torch
    import onnx
    from onnxruntime.quantization import quantize_dynamic, QuantType
    cfg = Config()
    dest = ROOT / 'web/public/models'
    candidates = ROOT / '.overnight/candidates'
    dest.mkdir(parents=True, exist_ok=True)
    candidates.mkdir(parents=True, exist_ok=True)
    entries = []

    def entry(path, source, precision, licence):
        entries.append(dict(file=path.name, size_bytes=path.stat().st_size,
                            sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                            source_path=str(source.relative_to(ROOT)).replace('\\', '/'),
                            precision=precision, licence_note=licence))

    for source, note in [(cfg.face_detector_path, 'Upstream YOLOv5-face; see modules/face_anti_spoofing/README.md. Weight licence not separately established; repository MIT does not establish upstream weight rights.'),
                         (cfg.antispoof_path, 'Upstream MiniFASNet architecture / Face-AntiSpoofing checkpoint, not trained by the HumanAuth team. See modules/face_anti_spoofing/README.md; weight licence not separately established.')]:
        target = dest / source.name
        shutil.copyfile(source, target)
        entry(target, source, 'fp32', note)

    doc = DocumentCheck(cfg)
    doc.ensure_loaded()
    target = dest / 'document-fp32.onnx'
    torch.onnx.export(doc.model, torch.zeros(1, 3, 224, 224), str(target),
                      input_names=['image'], output_names=['logits'], opset_version=17,
                      dynamo=False)
    onnx.checker.check_model(str(target))
    entry(target, cfg.document_model_path, 'fp32', 'Team checkpoint distributed in this MIT repository; training data limitations documented in bench/results/doc_class_map.json.')
    attempts = {}
    try:
        quantize_dynamic(str(target), str(candidates / 'document-int8.onnx'), weight_type=QuantType.QInt8)
        attempts['int8'] = 'Exported; requires runtime and score parity before selection.'
    except Exception as e:
        attempts['int8'] = f'{type(e).__name__}: {e}'
    try:
        from onnxconverter_common import float16
        onnx.save(float16.convert_float_to_float16(onnx.load(str(target)), keep_io_types=True), str(candidates / 'document-fp16.onnx'))
        attempts['fp16'] = 'Exported; requires runtime and score parity before selection.'
    except Exception as e:
        attempts['fp16'] = f'{type(e).__name__}: {e}'

    speakers = {}
    for name in ('Raj', 'Sahana'):
        source = cfg.voice_models_dir / f'{name}.gmm'
        with source.open('rb') as f:
            g = _RestrictedUnpickler(f).load()
        speakers[name] = dict(weights=g.weights_.tolist(), means=g.means_.tolist(),
                              covariances=g.covariances_.tolist(), covariance_type=g.covariance_type)
    params = dict(sampleRate=44100, stereo=True, flatten='numpy.append preemphasis flattens stereo in C order',
                  winlen=0.025, winstep=0.01, numcep=20, nfilt=26, nfft=1103,
                  lowfreq=0, highfreq=22050, preemph=0.97, ceplifter=22, appendEnergy=True,
                  window='ones', dct='II ortho', scale='per-column population std', delta_N=2)
    target = dest / 'voice-gmm.json'
    target.write_text(json.dumps(dict(parameters=params, speakers=speakers), indent=2)+'\n')
    entry(target, cfg.voice_models_dir, 'float64 JSON', 'Existing Raj / Sahana enrollment parameters already distributed in this MIT repository. No new enrollments included.')
    manifest = dict(schema_version=1, models=entries, total_bytes=sum(x['size_bytes'] for x in entries),
                    document_real_index=doc.real_index, document_class_order=list(cfg.document_class_order),
                    export_attempts=attempts,
                    limits_source='https://vercel.com/docs/limits#static-file-uploads', limits_checked='2026-11-01')
    (dest / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()
