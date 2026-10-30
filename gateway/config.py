"""Gateway configuration. Every value can be overridden with an environment variable."""
import os
from dataclasses import dataclass, field
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MODULES = REPO_ROOT / "modules"


def _env_float(name, default):
    return float(os.environ.get(name, default))


def _env_int(name, default):
    return int(os.environ.get(name, default))


@dataclass
class Config:
    # model files (all shipped in this repo)
    face_detector_path: Path = MODULES / "face_anti_spoofing/saved_models/yolov5s-face.onnx"
    antispoof_path: Path = MODULES / "face_anti_spoofing/saved_models/AntiSpoofing_bin_1.5_128.onnx"
    document_model_path: Path = MODULES / "document_forgery_detection/forgery_classifier.pth"
    voice_models_dir: Path = MODULES / "voice_authentication/gmm_models"

    # The document classifier's output order. The repo's inference scripts decode
    # index 0 as "Real", but bench/doc_class_map.py shows index 0 agrees with the
    # dataset's "fake" label on 99.8% / 100% / 99.2% of annotated regions
    # (train / valid / test, bench/results/doc_class_map.json), which also matches
    # data.yaml (names: ['fake', 'true']). So index 0 = fake here.
    document_class_order: tuple = ("fake", "real")

    # thresholds
    liveness_threshold: float = 0.5   # video_predict.py default (-t 0.5)
    document_threshold: float = 0.5   # P(genuine) needed to pass
    voice_threshold: float = 0.5      # posterior of the claimed speaker needed to pass
    fusion_threshold: float = 0.66    # carried over from modules/score_fusion/app.py
    weights: dict = field(default_factory=lambda: {"face": 1.0, "document": 1.0, "voice": 1.0})

    # input limits
    max_image_bytes: int = 8 * 1024 * 1024
    max_audio_bytes: int = 10 * 1024 * 1024
    max_image_side: int = 4096
    min_audio_seconds: float = 1.0
    max_audio_seconds: float = 20.0

    @classmethod
    def from_env(cls):
        c = cls()
        for name in ("face_detector_path", "antispoof_path", "document_model_path", "voice_models_dir"):
            v = os.environ.get("HUMANAUTH_" + name.upper())
            if v:
                setattr(c, name, Path(v))
        order = os.environ.get("HUMANAUTH_DOCUMENT_CLASS_ORDER")
        if order:
            c.document_class_order = tuple(s.strip().lower() for s in order.split(","))
        c.liveness_threshold = _env_float("HUMANAUTH_LIVENESS_THRESHOLD", c.liveness_threshold)
        c.document_threshold = _env_float("HUMANAUTH_DOCUMENT_THRESHOLD", c.document_threshold)
        c.voice_threshold = _env_float("HUMANAUTH_VOICE_THRESHOLD", c.voice_threshold)
        c.fusion_threshold = _env_float("HUMANAUTH_FUSION_THRESHOLD", c.fusion_threshold)
        c.max_image_bytes = _env_int("HUMANAUTH_MAX_IMAGE_BYTES", c.max_image_bytes)
        c.max_audio_bytes = _env_int("HUMANAUTH_MAX_AUDIO_BYTES", c.max_audio_bytes)
        return c
