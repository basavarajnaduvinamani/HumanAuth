"""Module adapters. The pure-numpy parts always run; real-weight tests skip if a dependency is missing."""
import importlib.util
import io
import pickle
from pathlib import Path

import numpy as np
import pytest

from gateway.checks import DocumentCheck, FaceLivenessCheck, VoiceCheck
from gateway.checks.document import _strip_prefix
from gateway.checks.voice import (_RestrictedUnpickler, gmm_mean_loglik, load_gmm, to_enrollment_format)
from gateway.validation import load_wav

from conftest import make_wav

REPO = Path(__file__).resolve().parents[1]
VOICE_DIR = REPO / "modules/voice_authentication"
has = lambda m: importlib.util.find_spec(m) is not None  # noqa: E731


# ---------- missing-weights path (no deps needed) ----------

def test_face_reports_missing_weights(cfg, tmp_path):
    cfg.antispoof_path = tmp_path / "nope.onnx"
    av = FaceLivenessCheck(cfg).availability()
    assert av["available"] is False
    assert ("not found" in av["reason"]) or ("not installed" in av["reason"])


def test_document_reports_missing_weights(cfg, tmp_path):
    cfg.document_model_path = tmp_path / "nope.pth"
    av = DocumentCheck(cfg).availability()
    assert av["available"] is False
    assert ("not found" in av["reason"]) or ("not installed" in av["reason"])


def test_voice_reports_no_enrolled_speakers(cfg, tmp_path):
    cfg.voice_models_dir = tmp_path
    check = VoiceCheck(cfg)
    res = check.run((16000, np.ones(16000, np.int16), None))
    assert res.status == "unavailable"
    assert ("No enrolled speaker" in res.detail) or ("not installed" in res.detail)
    assert check.enrolled() == []


# ---------- voice math ----------

def test_restricted_unpickler_refuses_arbitrary_objects():
    payload = pickle.dumps(Path("/etc/passwd"))
    with pytest.raises(pickle.UnpicklingError):
        _RestrictedUnpickler(io.BytesIO(payload)).load()


def test_bundled_gmms_load_with_expected_shape():
    g = load_gmm(VOICE_DIR / "gmm_models/Raj.gmm")
    assert g["means"].shape == (16, 40) and g["weights"].shape == (16,)


@pytest.mark.skipif(not has("sklearn"), reason="scikit-learn not installed")
def test_numpy_gmm_matches_sklearn_score():
    from sklearn.mixture import GaussianMixture
    rng = np.random.default_rng(0)
    X = rng.normal(size=(300, 40))
    gm = GaussianMixture(n_components=4, covariance_type="diag", random_state=0).fit(X)
    params = {"weights": gm.weights_, "means": gm.means_, "prec_chol": gm.precisions_cholesky_}
    Y = rng.normal(size=(50, 40))
    assert abs(gmm_mean_loglik(params, Y) - gm.score(Y)) < 1e-8


def test_enrollment_format_resamples_and_duplicates_channel():
    out = to_enrollment_format(16000, (np.ones(16000) * 1000).astype(np.int16))
    assert out.shape == (44100, 2) and out.dtype == np.int16 and (out == 1000).all()


@pytest.mark.skipif(not has("python_speech_features"), reason="python_speech_features not installed")
def test_voice_real_models_on_bundled_clip(cfg):
    """test.wav is the clip recognize.py records; it should match an enrolled speaker strongly."""
    rate, audio = load_wav("voice", (VOICE_DIR / "test.wav").read_bytes(), cfg)
    check = VoiceCheck(cfg)
    assert check.enrolled() == ["Raj", "Sahana"]
    r = check.run((rate, audio, None))
    assert r.status == "ok" and 0.0 <= r.score <= 1.0
    best = r.extra["best_match"]
    other = "Sahana" if best == "Raj" else "Raj"
    assert check.run((rate, audio, best)).passed is True
    assert check.run((rate, audio, other)).passed is False


@pytest.mark.skipif(not has("python_speech_features"), reason="python_speech_features not installed")
def test_voice_runs_on_synthetic_tone(cfg):
    rate, audio = load_wav("voice", make_wav(seconds=2.0), cfg)
    r = VoiceCheck(cfg).run((rate, audio, "Raj"))
    assert r.status == "ok" and np.isfinite(r.score)


# ---------- real weights: face (onnxruntime) and document (torch) ----------

@pytest.mark.skipif(not (has("onnxruntime") and has("cv2")), reason="onnxruntime / opencv not installed")
def test_face_real_models_no_face_is_vetoed(cfg):
    r = FaceLivenessCheck(cfg).run(np.full((240, 320, 3), 127, np.uint8))
    assert r.status == "ok" and r.passed is False and r.label == "no_face"


@pytest.mark.skipif(not (has("onnxruntime") and has("cv2")), reason="onnxruntime / opencv not installed")
def test_face_real_models_score_a_photo(cfg):
    from PIL import Image
    img = np.asarray(Image.open(REPO / "modules/document_forgery_detection/yolov5/data/images/zidane.jpg").convert("RGB"))
    face = img[0:420, 640:1080]  # right-hand person only
    r = FaceLivenessCheck(cfg).run(np.ascontiguousarray(face))
    assert r.status == "ok" and r.extra["faces"] == 1 and 0.0 <= r.score <= 1.0


@pytest.mark.skipif(not (has("torch") and has("torchvision")), reason="torch not installed")
def test_document_real_model_scores_an_image(cfg):
    r = DocumentCheck(cfg).run(np.full((300, 400, 3), 230, np.uint8))
    assert r.status == "ok" and 0.0 <= r.score <= 1.0 and r.label in ("genuine", "forged")


def test_document_state_dict_prefixes_are_stripped():
    assert _strip_prefix({"model.fc.weight": 1, "model.fc.bias": 2}) == {"fc.weight": 1, "fc.bias": 2}
    assert _strip_prefix({"fc.weight": 1}) == {"fc.weight": 1}


def test_bad_class_order_makes_document_unavailable(cfg):
    cfg.document_class_order = ("genuine", "fake")
    assert DocumentCheck(cfg).availability()["available"] is False
