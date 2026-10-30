"""CPU latency benchmark for the verification gateway.

Measures, per stage, with the real models in this repo:
  cold  : fresh Python process -> import + model load + first inference (repeated --cold-runs times)
  warm  : models already loaded, --warm-runs repeated inferences; p50 / p95 / mean

Stages: input decode, face detection (YOLOv5s-face), face anti-spoofing (MiniFASNet),
document classifier (ResNet18), voice features (MFCC + deltas), voice GMM scoring,
fusion, and the whole POST /api/verify request through Flask's test client.

Timing boundary: from bytes already in server memory to the JSON response. It
does NOT include camera / microphone capture, network upload or browser rendering.

    python bench/latency.py                          # bundled sample inputs
    python bench/latency.py --selfie me.jpg --document id.jpg --voice me.wav --claimed Raj
Writes bench/results/latency_cpu.json and bench/results/latency_cpu.md.
"""
import argparse
import io
import json
import os
import platform
import statistics
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))
SAMPLE_SELFIE = REPO / "modules/document_forgery_detection/yolov5/data/images/zidane.jpg"
SAMPLE_VOICE = REPO / "modules/voice_authentication/test.wav"


def sample_inputs():
    """Selfie: one face cropped from the bundled YOLOv5 sample; document: synthetic card; voice: test.wav."""
    from PIL import Image, ImageDraw
    buf = io.BytesIO()
    Image.open(SAMPLE_SELFIE).convert("RGB").crop((640, 0, 1080, 420)).save(buf, "JPEG", quality=92)
    selfie = buf.getvalue()
    d = Image.new("RGB", (860, 540), (236, 240, 246))
    g = ImageDraw.Draw(d)
    g.rectangle((0, 0, 860, 90), fill=(39, 83, 214))
    g.text((30, 30), "SPECIMEN - SYNTHETIC TEST DOCUMENT", fill="white")
    buf = io.BytesIO()
    d.save(buf, "PNG")
    return selfie, buf.getvalue(), SAMPLE_VOICE.read_bytes()


def load_inputs(args):
    selfie, doc, voice = sample_inputs()
    if args.selfie:
        selfie = Path(args.selfie).read_bytes()
    if args.document:
        doc = Path(args.document).read_bytes()
    if args.voice:
        voice = Path(args.voice).read_bytes()
    return selfie, doc, voice


def timed(fn):
    t0 = time.perf_counter()
    out = fn()
    return (time.perf_counter() - t0) * 1000, out


def stage_fns(cfg, checks, selfie, doc, voice, claimed):
    """Return {stage: zero-arg callable}. Models must already be loaded."""
    from gateway.checks.face import increased_crop
    from gateway.checks.voice import ENROLL_RATE, extract_features, gmm_mean_loglik, to_enrollment_format
    from gateway.fusion import fuse
    from gateway.validation import load_image, load_wav

    face, document, vc = checks["face"], checks["document"], checks["voice"]
    rgb = load_image("selfie", selfie, cfg)
    drgb = load_image("document", doc, cfg)
    rate, audio = load_wav("voice", voice, cfg)
    box = face.detector([rgb], max_detection=2)[0]
    crop = increased_crop(rgb, box.flatten()[:4].astype(int), 1.5) if box.shape[0] else rgb
    feats = extract_features(to_enrollment_format(rate, audio), ENROLL_RATE, vc.mfcc)
    results = [face.run(rgb), document.run(drgb), vc.run((rate, audio, claimed))]

    def voice_scoring():
        return [gmm_mean_loglik(g, feats) for g in vc.speakers.values()]

    return {
        "decode_inputs": lambda: (load_image("selfie", selfie, cfg), load_image("document", doc, cfg),
                                  load_wav("voice", voice, cfg)),
        "face_detect": lambda: face.detector([rgb], max_detection=2),
        "face_antispoof": lambda: face.antispoof([crop]),
        "document_classifier": lambda: document.run(drgb),
        "voice_features": lambda: extract_features(to_enrollment_format(rate, audio), ENROLL_RATE, vc.mfcc),
        "voice_gmm_scoring": voice_scoring,
        "fusion": lambda: fuse(results, cfg),
    }


def make_client(cfg, checks):
    from gateway import create_app
    app = create_app(cfg, checks=checks)
    return app.test_client()


def post(client, selfie, doc, voice, claimed):
    r = client.post("/api/verify", content_type="multipart/form-data", data={
        "selfie": (io.BytesIO(selfie), "s.jpg"), "document": (io.BytesIO(doc), "d.png"),
        "voice": (io.BytesIO(voice), "v.wav"), "claimed_identity": claimed})
    assert r.status_code == 200, r.get_json()
    return r.get_json()


def cold_child(args):
    """Runs in a fresh process; prints one JSON line."""
    t_start = time.perf_counter()
    from gateway.app import default_checks
    from gateway.config import Config
    cfg = Config.from_env()
    checks = default_checks(cfg)
    out = {"import_ms": (time.perf_counter() - t_start) * 1000}
    for name, c in checks.items():
        ms, _ = timed(c.ensure_loaded)
        out[f"load_{name}_ms"] = ms
    selfie, doc, voice = load_inputs(args)
    client = make_client(cfg, checks)
    ms, body = timed(lambda: post(client, selfie, doc, voice, args.claimed))
    out["first_request_ms"] = ms
    out["process_to_first_response_ms"] = (time.perf_counter() - t_start) * 1000
    out["decision"] = body["decision"]
    print(json.dumps(out))


def pct(xs, q):
    xs = sorted(xs)
    k = (len(xs) - 1) * q
    lo, hi = int(k), min(int(k) + 1, len(xs) - 1)
    return xs[lo] + (xs[hi] - xs[lo]) * (k - lo)


def summarize(xs):
    return {"n": len(xs), "p50_ms": round(pct(xs, 0.5), 2), "p95_ms": round(pct(xs, 0.95), 2),
            "mean_ms": round(statistics.mean(xs), 2), "min_ms": round(min(xs), 2), "max_ms": round(max(xs), 2)}


def hardware():
    cpu = platform.processor() or ""
    try:
        for line in Path("/proc/cpuinfo").read_text().splitlines():
            if line.startswith("model name"):
                cpu = line.split(":", 1)[1].strip()
                break
    except OSError:
        pass
    info = {"cpu": cpu, "logical_cores": os.cpu_count(), "os": platform.platform(),
            "python": platform.python_version(), "gpu_used": False}
    try:
        import torch
        info["torch"] = torch.__version__
        info["torch_threads"] = torch.get_num_threads()
    except ImportError:
        pass
    try:
        import onnxruntime
        info["onnxruntime"] = onnxruntime.__version__
    except ImportError:
        pass
    try:
        mem = [l for l in Path("/proc/meminfo").read_text().splitlines() if l.startswith("MemTotal")][0]
        info["ram_gb"] = round(int(mem.split()[1]) / 1024 ** 2, 1)
    except (OSError, IndexError):
        pass
    return info


def write_table(res, path):
    lines = [f"# Gateway latency on CPU ({res['generated_at']})", "",
             f"Hardware: {res['hardware']['cpu']}, {res['hardware']['logical_cores']} logical cores, "
             f"{res['hardware'].get('ram_gb', '?')} GB RAM, no GPU. Python {res['hardware']['python']}, "
             f"torch {res['hardware'].get('torch', '-')}, onnxruntime {res['hardware'].get('onnxruntime', '-')}.", "",
             f"Inputs: {res['inputs']}. Boundary: {res['boundary']}", "",
             f"## Warm (models loaded, n = {res['warm_runs']} per stage)", "",
             "| Stage | p50 ms | p95 ms | mean ms |", "| --- | ---: | ---: | ---: |"]
    for k, v in res["warm"].items():
        lines.append(f"| {k} | {v['p50_ms']:.1f} | {v['p95_ms']:.1f} | {v['mean_ms']:.1f} |")
    lines += ["", f"## Cold (fresh process, n = {len(res['cold_runs'])})", "",
              "| Measure | p50 ms | max ms |", "| --- | ---: | ---: |"]
    for k, v in res["cold"].items():
        lines.append(f"| {k} | {v['p50_ms']:.1f} | {v['max_ms']:.1f} |")
    lines += ["", "Generated by `python bench/latency.py`; raw numbers in latency_cpu.json.", ""]
    Path(path).write_text("\n".join(lines))


def main():
    p = argparse.ArgumentParser(description="HumanAuth gateway CPU latency benchmark")
    p.add_argument("--selfie")
    p.add_argument("--document")
    p.add_argument("--voice")
    p.add_argument("--claimed", default="Raj", help="enrolled identity to claim for the voice check")
    p.add_argument("--warm-runs", type=int, default=50)
    p.add_argument("--cold-runs", type=int, default=3)
    p.add_argument("--out", default=str(REPO / "bench/results/latency_cpu"))
    p.add_argument("--_cold-child", action="store_true", help=argparse.SUPPRESS)
    args = p.parse_args()
    if args._cold_child:
        return cold_child(args)

    passthrough = [a for pair in (("--selfie", args.selfie), ("--document", args.document),
                                  ("--voice", args.voice), ("--claimed", args.claimed)) if pair[1] for a in pair]
    cold_runs = []
    for i in range(args.cold_runs):
        r = subprocess.run([sys.executable, __file__, "--_cold-child", *passthrough],
                           capture_output=True, text=True, check=True)
        cold_runs.append(json.loads(r.stdout.strip().splitlines()[-1]))
        print(f"cold run {i + 1}: {cold_runs[-1]['process_to_first_response_ms']:.0f} ms to first response")

    from gateway.app import default_checks
    from gateway.config import Config
    cfg = Config.from_env()
    checks = default_checks(cfg)
    for c in checks.values():
        c.ensure_loaded()
    selfie, doc, voice = load_inputs(args)
    fns = stage_fns(cfg, checks, selfie, doc, voice, args.claimed)
    client = make_client(cfg, checks)
    fns["end_to_end_request"] = lambda: post(client, selfie, doc, voice, args.claimed)

    warm = {}
    for name, fn in fns.items():
        for _ in range(3):  # warm-up, not recorded
            fn()
        warm[name] = summarize([timed(fn)[0] for _ in range(args.warm_runs)])
        print(f"{name:22s} p50 {warm[name]['p50_ms']:8.1f} ms   p95 {warm[name]['p95_ms']:8.1f} ms")

    cold_keys = [k for k in cold_runs[0] if k.endswith("_ms")]
    res = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "hardware": hardware(),
        "inputs": "custom files" if (args.selfie or args.document or args.voice) else
                  "bundled samples (selfie crop of yolov5 zidane.jpg, synthetic 860x540 document, "
                  "voice_authentication/test.wav 4.0 s stereo 44.1 kHz)",
        "boundary": ("stages: bytes in server memory -> stage output; end_to_end_request: Flask test client POST, "
                     "so it also includes in-process multipart encoding/parsing of the ~0.75 MB upload. "
                     "Excludes camera/mic capture, network upload and browser rendering."),
        "warm_runs": args.warm_runs,
        "warm": warm,
        "cold": {k: summarize([r[k] for r in cold_runs]) for k in cold_keys},
        "cold_runs": cold_runs,
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.with_suffix(".json").write_text(json.dumps(res, indent=2) + "\n")
    write_table(res, out.with_suffix(".md"))
    print("wrote", out.with_suffix(".json"), "and", out.with_suffix(".md"))


if __name__ == "__main__":
    main()
