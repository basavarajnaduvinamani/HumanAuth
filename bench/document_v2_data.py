"""Source-aware SIDTD template loader. Source media and records stay local.

No archive extraction, network calls, or fitting occurs on import. Field boxes
come from the authors' original-document VIA annotations, never guessed grids.
"""
import hashlib
import json
from pathlib import PurePosixPath


def template_id(source):
    """MIDV source name = template + numeric document identifier."""
    stem = PurePosixPath(source).stem
    template, index = stem.rsplit("_", 1)
    if not index.isdigit() or not template:
        raise ValueError("Unrecognised source-document ID")
    return template


def split_templates(templates, seed=20261103):
    ordered = sorted(set(templates), key=lambda v: hashlib.sha256(f"{seed}:{v}".encode()).hexdigest())
    if len(ordered) < 5:
        raise ValueError("At least five source templates required")
    train_end = max(1, int(len(ordered) * .6))
    dev_end = min(len(ordered)-1, train_end + max(1, int(len(ordered)*.2)))
    return {v: "train" if i < train_end else "dev" if i < dev_end else "test" for i, v in enumerate(ordered)}


def field_box(annotation, source, field):
    filename = PurePosixPath(source).stem.rsplit("_", 1)[1] + ".jpg"
    matches = [v for v in annotation["_via_img_metadata"].values() if v["filename"] == filename]
    if len(matches) != 1:
        raise ValueError("Ambiguous or missing source annotation")
    regions = [r["shape_attributes"] for r in matches[0]["regions"]
               if r["region_attributes"].get("field_name") == field]
    if len(regions) != 1 or regions[0].get("name") != "rect":
        raise ValueError("No unique rectangular edited-field annotation")
    r = regions[0]
    if any(not isinstance(r[k], (int, float)) for k in ("x", "y", "width", "height")):
        raise ValueError("Non-numeric field coordinates")
    x,y,w,h = [float(r[k]) for k in ("x", "y", "width", "height")]
    import math
    if not all(math.isfinite(v) for v in (x,y,w,h)) or min(x,y) < 0 or min(w,h) < 2:
        raise ValueError("Invalid field rectangle")
    return [int(x), int(y), int(x+w), int(y+h)]


def load_records(archive):
    names = set(archive.namelist())
    prefix = "templates/Annotations/"
    real_annotations = {PurePosixPath(n).stem: json.loads(archive.read(n))
                        for n in sorted(names) if n.startswith(prefix+"reals/") and n.endswith(".json")}
    splits = split_templates(real_annotations)
    records, rejected, seen = [], [], set()
    for name in sorted(names):
        if not name.startswith(prefix+"fakes/") or not name.endswith(".json"):
            continue
        meta = json.loads(archive.read(name))
        try:
            source = meta["src"]
            template = template_id(source)
            second = meta.get("second_src")
            if second not in (None, "None", "") and template_id(second) != template:
                raise ValueError("Cross-template donor excluded to preserve disjointness")
            bbox = field_box(real_annotations[template], source, meta["field"])
            fake = "templates/Images/fakes/" + PurePosixPath(name).stem + ".jpg"
            real = "templates/Images/reals/" + source
            if real not in names or fake not in names:
                raise ValueError("Missing paired source image")
            for path,label in [(real,0),(fake,1)]:
                key = (path, tuple(bbox))
                if key in seen:
                    continue
                seen.add(key)
                records.append(dict(id=path+":"+meta["field"],path=path,label=label,
                                    source=source,template=template,split=splits[template],box=bbox,
                                    field=meta["field"],donor=second))
        except (ValueError, KeyError, TypeError) as exc:
            rejected.append(dict(annotation=name,reason=str(exc)))
    return records,rejected,splits


def bounded_records(records, cap_by_split=None, seed=20261103):
    """Select source groups by hash, never choose on a model output.

    Keep every retained record of a selected source; the class cap is soft at a
    source boundary so paired genuine/forged regions cannot split apart.
    """
    caps = cap_by_split or {"train":500,"dev":150,"test":150}
    out = []
    for split,cap in caps.items():
        rows = [r for r in records if r["split"]==split]
        sources = sorted({r["source"] for r in rows},key=lambda s:hashlib.sha256(f"{seed}:{s}".encode()).hexdigest())
        counts = {0:0,1:0}
        for source in sources:
            if min(counts.values()) >= cap:
                break
            selected = [r for r in rows if r["source"]==source]
            out.extend(selected)
            for row in selected:
                counts[row["label"]] += 1
    return out
