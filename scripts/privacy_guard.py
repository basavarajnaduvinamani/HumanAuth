"""Release guard: no audio, personal templates, or unreviewed raster images.

This is a regression guard, not automatic face recognition. Every new raster
image requires an explicit provenance review and SHA-256 allowlist update.
Ignored local research data is outside the release scan and must never be staged.
"""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POLICY = ROOT / "bench/fixtures/privacy-policy.json"
AUDIO_VIDEO = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".opus", ".aac", ".aiff", ".aif", ".wma", ".webm", ".mp4", ".mov", ".avi", ".pcm"}
TEMPLATES = {".gmm", ".pickle", ".pkl", ".joblib", ".npy", ".npz", ".rgb", ".db", ".sqlite"}
RASTER = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif", ".tiff", ".tif"}
PRIVATE_PATH = re.compile(r"(?:^|/)(?:private|private-data|captures|recordings|enrollments|enrolments|face_database|gmm_models)(?:/|$)|(?:^|/)(?:voice-gmm\.json|test\.wav)$", re.I)
MEDIA_DATA = re.compile(rb"data:(?:audio|video|image)/(?:[^;,\s]+);base64,[A-Za-z0-9+/]{80,}", re.I)


def violations(path, data, policy):
    path = str(path).replace("\\", "/")
    suffix = Path(path).suffix.lower()
    digest = hashlib.sha256(data).hexdigest()
    issues = []
    if PRIVATE_PATH.search(path):
        issues.append("private-data path")
    if suffix in AUDIO_VIDEO or data[:4] in (b"fLaC", b"OggS") or data[:3] == b"ID3" or (data[:4] == b"RIFF" and data[8:12] == b"WAVE") or data[4:8] == b"ftyp":
        issues.append("audio/video asset")
    if suffix in TEMPLATES:
        issues.append("serialized enrollment/raw feature asset")
    if digest in policy.get("private_sha256", []):
        issues.append("known private biometric content")
    if suffix in RASTER and digest not in {row["sha256"] for row in policy.get("images", [])}:
        issues.append("raster image lacks reviewed provenance hash")
    if suffix in {".html", ".json", ".ipynb", ".svg", ".md"} and MEDIA_DATA.search(data):
        issues.append("embedded media payload")
    if suffix == ".ipynb":
        book = json.loads(data)
        for cell in book.get("cells", []):
            for output in cell.get("outputs", []):
                if any(k.startswith(("image/", "audio/", "video/")) for k in output.get("data", {})):
                    issues.append("notebook media output")
    if Path(path).name in {"reference.json", "synthetic-voice-reference.json"} and "synthetic" in path:
        if digest not in policy.get("synthetic_template_sha256", []):
            issues.append("synthetic template lacks reviewed generator hash")
    return sorted(set(issues))


def git(*args):
    # Owner's required guards before every Git read, including CI scans.
    subprocess.run(["git", "status", "--short"], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
    subprocess.run(["git", "stash", "list"], cwd=ROOT, check=True, stdout=subprocess.DEVNULL)
    return subprocess.check_output(["git", *args], cwd=ROOT)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--built", action="store_true", help="also require and scan Next.js output")
    args = parser.parse_args()
    policy = json.loads(POLICY.read_text(encoding="utf-8"))
    paths = {ROOT / p.decode() for p in git("ls-files", "-z").split(b"\0") if p}
    # Include new public assets even before staging them.
    paths.update(p for p in (ROOT / "web/public").rglob("*") if p.is_file())
    if args.built:
        build = ROOT / "web/.next"
        if not (build / "BUILD_ID").is_file():
            raise SystemExit("Privacy guard requires a completed production build")
        paths.update(p for folder in (build / "static", build / "server/app") for p in folder.rglob("*") if p.is_file())
    findings = []
    checked = 0
    for p in sorted(paths):
        if not p.is_file():  # deleted tracked assets will be removed by this commit
            continue
        checked += 1
        rel = p.relative_to(ROOT).as_posix()
        for issue in violations(rel, p.read_bytes(), policy):
            findings.append(f"{rel}: {issue}")
    if findings:
        raise SystemExit("Privacy guard failed:\n" + "\n".join(findings))
    print(f"Privacy guard passed: {checked} source/public/build files; {len(policy['images'])} reviewed image entries. No audio assets, private paths, known private hashes, or unreviewed raster images.")


if __name__ == "__main__":
    main()
