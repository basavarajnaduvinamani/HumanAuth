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

    source = cfg.voice_models_dir / 'reference.json'
    synthetic = json.loads(source.read_text())
    if synthetic.get('synthetic_only') is not True:
        raise ValueError('Only synthetic fixture references may be exported')
    target = dest / 'synthetic-voice-reference.json'
    shutil.copyfile(source, target)
    entry(target, source, 'float64 JSON', 'Generated only from local Flite synthetic speech; no personal enrollment. Fixture compatibility, not visitor verification.')
    speech = dest / 'flite-synthesis.wasm.gz'
    entry(speech, ROOT / 'licenses/flite-COPYING.txt', 'gzip of WASM plus embedded synthesis voices', 'Flite permissive CMU/BSD-like collection; retain full licenses/flite-COPYING.txt and file-specific notices. Public research-demo redistribution permitted.')
    entries[-1].update(source_url='https://github.com/echogarden-project/flite-wasi', package_version='0.1.1', uncompressed_bytes=21530456)
    manifest = dict(schema_version=2, models=entries, total_bytes=sum(x['size_bytes'] for x in entries),
                    voice_file='synthetic-voice-reference.json', synthetic_speech_file='flite-synthesis.wasm.gz',
                    document_real_index=doc.real_index, document_class_order=list(cfg.document_class_order),
                    export_attempts=attempts,
                    limits_source='https://vercel.com/docs/limits#static-file-uploads', limits_checked='2026-11-01')
    (dest / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8', newline='\n')
    print(json.dumps(manifest, indent=2))


if __name__ == '__main__':
    main()
