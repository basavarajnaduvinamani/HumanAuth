"""Optional detector integration without private checkpoints or recordings."""
import io
from pathlib import Path

import numpy as np

from conftest import StubCheck, make_jpeg, make_png, make_wav
from gateway import create_app
from gateway.app import default_checks
from gateway.fusion import fuse
from gateway.checks.base import ModalityResult
from gateway.checks.voice_deepfake import VoiceDeepfakeCheck


def result(name, passed=True, status="ok"):
    return ModalityResult(name, status, score=0.9 if passed else 0.1,
                          passed=passed, detail=name)


def test_optional_check_disabled_by_default(cfg):
    assert "voice_deepfake" not in default_checks(cfg)


def test_optional_checkpoint_configuration(monkeypatch, cfg):
    monkeypatch.setenv("HUMANAUTH_VOICE_DEEPFAKE_MODEL_PATH", "private/local.pth")
    assert cfg.from_env().voice_deepfake_model_path == Path("private/local.pth")


def test_enabled_missing_weights_is_unavailable(cfg, tmp_path):
    cfg.voice_deepfake_model_path = tmp_path / "missing.pth"
    r = VoiceDeepfakeCheck(cfg).run((16000, np.ones(16000, dtype=np.int16)))
    assert r.status == "unavailable" and r.score is None
    assert "weights not found" in r.detail


def test_synthetic_voice_blocks_otherwise_successful_verification(cfg):
    cfg.voice_deepfake_model_path = Path("private.pth")
    r = fuse([result("face"), result("document"), result("voice"),
              result("voice_deepfake", False)], cfg)
    assert r["decision"] == "reject"
    assert any("Voice deepfake check failed" in x for x in r["reasons"])


def test_enabled_missing_detector_never_approves(cfg):
    cfg.voice_deepfake_model_path = Path("private.pth")
    assert fuse([result("face"), result("document"), result("voice")], cfg)["decision"] == "review"


def test_liveness_veto_still_overrides_optional_check(cfg):
    cfg.voice_deepfake_model_path = Path("private.pth")
    assert fuse([result("face", False), result("document"), result("voice"),
                 result("voice_deepfake")], cfg)["liveness_veto"] is True


def test_optional_check_receives_audio_and_is_renderable(cfg, tmp_path, monkeypatch):
    cfg.voice_deepfake_model_path = Path("private.pth")
    checks = {n: StubCheck(cfg, n, speakers=["Alice"] if n == "voice" else None)
              for n in ("face", "document", "voice", "voice_deepfake")}
    app = create_app(cfg, checks)
    monkeypatch.chdir(tmp_path)
    r = app.test_client().post("/api/verify", data={
        "selfie": (io.BytesIO(make_jpeg()), "s.jpg"),
        "document": (io.BytesIO(make_png()), "d.png"),
        "voice": (io.BytesIO(make_wav()), "v.wav"), "claimed_identity": "Alice"})
    assert r.status_code == 200
    assert r.json["decision"] == "approve"
    assert r.json["modalities"]["voice_deepfake"]["status"] == "ok"
    rate, audio = checks["voice_deepfake"].calls[0]
    assert rate == 16000 and audio.ndim == 1
    assert list(tmp_path.iterdir()) == []
    health = app.test_client().get("/api/health").json
    assert health["modules"]["voice_deepfake"]["available"] is True
