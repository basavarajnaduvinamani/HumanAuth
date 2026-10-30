from gateway.checks.base import ModalityResult
from gateway.fusion import fuse


def ok(name, score, passed=None, thr=0.5):
    return ModalityResult(name, "ok", score=score, passed=score >= thr if passed is None else passed, threshold=thr,
                          detail=f"{name} {score}")


def test_all_pass_approves(cfg):
    out = fuse([ok("face", 0.9), ok("document", 0.8), ok("voice", 0.95)], cfg)
    assert out["decision"] == "approve"
    assert out["liveness_veto"] is False
    assert abs(out["fused_score"] - (0.9 + 0.8 + 0.95) / 3) < 1e-4


def test_liveness_veto_overrides_high_scores(cfg):
    out = fuse([ok("face", 0.2), ok("document", 1.0), ok("voice", 1.0)], cfg)
    assert out["decision"] == "reject"
    assert out["liveness_veto"] is True
    assert out["reasons"][0].startswith("Liveness veto")


def test_veto_even_when_mean_is_above_threshold(cfg):
    # mean = 0.83 >= 0.66, but the face failed: the old averaging app would have passed this
    out = fuse([ok("face", 0.49), ok("document", 1.0), ok("voice", 1.0)], cfg)
    assert out["fused_score"] > cfg.fusion_threshold
    assert out["decision"] == "reject"


def test_document_failure_rejects(cfg):
    out = fuse([ok("face", 0.9), ok("document", 0.1), ok("voice", 0.9)], cfg)
    assert out["decision"] == "reject" and not out["liveness_veto"]
    assert any("Document check failed" in r for r in out["reasons"])


def test_unavailable_module_goes_to_review_not_approve(cfg):
    out = fuse([ok("face", 0.9), ModalityResult("document", "unavailable", detail="weights missing"),
                ok("voice", 0.9)], cfg)
    assert out["decision"] == "review"
    assert any("weights missing" in r for r in out["reasons"])


def test_missing_liveness_never_approves(cfg):
    out = fuse([ok("document", 1.0), ok("voice", 1.0)], cfg)
    assert out["decision"] == "review"
    assert out["liveness_veto"] is False


def test_low_mean_rejects_even_if_each_passes(cfg):
    out = fuse([ok("face", 0.55), ok("document", 0.55), ok("voice", 0.55)], cfg)
    assert out["decision"] == "reject"
    assert any("below" in r for r in out["reasons"])


def test_weights_are_applied(cfg):
    cfg.weights = {"face": 2.0, "document": 1.0, "voice": 1.0}
    out = fuse([ok("face", 1.0), ok("document", 0.6), ok("voice", 0.6)], cfg)
    assert abs(out["fused_score"] - 0.8) < 1e-4


def test_failure_takes_priority_over_missing(cfg):
    out = fuse([ok("face", 0.9), ok("document", 0.1)], cfg)
    assert out["decision"] == "reject"
