"""Check which output index of forgery_classifier.pth means "fake".

The repo's inference scripts decode index 0 as Real, but the dataset's data.yaml
lists names ['fake', 'true'] (YOLO class 0 = fake) and the training class map
was not saved. This script runs the classifier on every annotated region of the
bundled Roboflow splits (oracle boxes, as in predict_model.py) and reports how
often each possible decoding agrees with the region labels. It also reports how
many test images share a source page with a training image (Roboflow exports
augmented copies of one page with different .rf.<hash> suffixes).

This is a diagnostic of the label map, not a held-out accuracy claim.

    python bench/doc_class_map.py            # writes bench/results/doc_class_map.json
"""
import argparse
import json
import platform
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO))
DATA = REPO / "modules/document_forgery_detection/src/data/id_dataset"


def source_page(name):
    return re.sub(r"_(jpg|png|jpeg)\.rf\.[0-9a-f]+\.(jpg|png|jpeg)$", "", name)


def main():
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--out", default=str(REPO / "bench/results/doc_class_map.json"))
    args = p.parse_args()

    import torch
    from PIL import Image
    from gateway.checks import DocumentCheck
    from gateway.config import Config

    cfg = Config()
    check = DocumentCheck(cfg)
    check.ensure_loaded()
    model, tf = check.model, check.transform

    out = {"generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "model": str(cfg.document_model_path.relative_to(REPO)),
           "condition": "oracle region crops from YOLO label boxes; label 0=fake, 1=true (data.yaml)",
           "python": platform.python_version(), "torch": torch.__version__, "splits": {}}
    train_sources = {source_page(f.name) for f in (DATA / "train/images").iterdir()}

    for split in ("train", "valid", "test"):
        n = agree_idx0_is_real = 0
        pred_counts = [0, 0]
        for img_path in sorted((DATA / split / "images").iterdir()):
            lbl = DATA / split / "labels" / (img_path.stem + ".txt")
            if not lbl.exists():
                continue
            image = Image.open(img_path).convert("RGB")
            w, h = image.size
            for line in lbl.read_text().splitlines():
                parts = line.split()
                if len(parts) != 5:
                    continue
                cls = int(parts[0])
                xc, yc, bw, bh = map(float, parts[1:])
                box = (int((xc - bw / 2) * w), int((yc - bh / 2) * h), int((xc + bw / 2) * w), int((yc + bh / 2) * h))
                if box[2] - box[0] < 2 or box[3] - box[1] < 2:
                    continue
                with torch.no_grad():
                    idx = int(model(tf(image.crop(box)).unsqueeze(0)).argmax(1))
                pred_counts[idx] += 1
                is_fake = cls == 0
                # decoding A (repo scripts): idx 0 = real, idx 1 = fake
                agree_idx0_is_real += int((idx == 1) == is_fake)
                n += 1
        images = [f.name for f in (DATA / split / "images").iterdir()]
        out["splits"][split] = {
            "regions": n,
            "predicted_index_counts": pred_counts,
            "agreement_if_index0_is_real": round(agree_idx0_is_real / n, 4) if n else None,
            "agreement_if_index0_is_fake": round((n - agree_idx0_is_real) / n, 4) if n else None,
            "images": len(images),
            "images_sharing_source_page_with_train": (None if split == "train" else
                                                      sum(source_page(x) in train_sources for x in images)),
        }

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(out, indent=2) + "\n")
    print(json.dumps(out["splits"], indent=2))
    print("wrote", args.out)


if __name__ == "__main__":
    main()
