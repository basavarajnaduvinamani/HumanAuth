"""Decision fusion with a liveness veto.

Order of rules (first match wins):
1. Liveness veto: the face check ran and did not find exactly one live face -> REJECT.
2. Any other check ran and failed -> REJECT.
3. Any check did not produce a score (not provided, module unavailable, error)
   -> REVIEW. The gateway never approves on partial evidence.
4. Weighted mean of the scores below cfg.fusion_threshold -> REJECT.
5. Otherwise APPROVE.

The 0.66 mean threshold is the one the original score_fusion/app.py used.
The thresholds are not calibrated on a held-out set.
"""
ORDER = ("face", "document", "voice")
NAMES = {"face": "Liveness", "document": "Document", "voice": "Voice", "voice_deepfake": "Voice deepfake"}


def fuse(results, cfg):
    order = ORDER + (("voice_deepfake",) if cfg.voice_deepfake_model_path is not None else ())
    by_name = {r.name: r for r in results}
    reasons = []
    face = by_name.get("face")
    veto = bool(face and face.status == "ok" and not face.passed)
    if veto:
        reasons.append(f"Liveness veto: {face.detail}")

    failed = [by_name[n] for n in order if n in by_name and n != "face"
              and by_name[n].status == "ok" and not by_name[n].passed]
    for r in failed:
        reasons.append(f"{NAMES[r.name]} check failed: {r.detail}")

    missing = [n for n in order if n not in by_name or by_name[n].status != "ok"]
    for n in missing:
        r = by_name.get(n)
        why = "not provided" if r is None or r.status == "not_provided" else (r.detail or r.status)
        reasons.append(f"{NAMES[n]} check did not run: {why}")

    scored = [by_name[n] for n in order if n in by_name and by_name[n].status == "ok"]
    total_w = sum(cfg.weights.get(r.name, 1.0) for r in scored)
    fused = (sum(cfg.weights.get(r.name, 1.0) * r.score for r in scored) / total_w) if total_w else None

    if veto or failed:
        decision = "reject"
    elif missing:
        decision = "review"
        reasons.append("Sent to manual review: approval needs every enabled check.")
    elif fused < cfg.fusion_threshold:
        decision = "reject"
        reasons.append(f"Fused score {fused:.2f} is below the {cfg.fusion_threshold:.2f} threshold.")
    else:
        decision = "approve"
        reasons.append(f"All checks passed; fused score {fused:.2f} >= {cfg.fusion_threshold:.2f}.")

    return {
        "decision": decision,
        "liveness_veto": veto,
        "fused_score": None if fused is None else round(fused, 4),
        "fusion_threshold": cfg.fusion_threshold,
        "reasons": reasons,
    }
