"""HumanAuth verification gateway (Flask).

POST /api/verify   multipart form: selfie, document (JPEG/PNG/WebP), voice (WAV), claimed_identity
GET  /api/health   which modules can run here and why not
GET  /             onboarding web UI

Uploads are decoded in memory, scored and discarded. Nothing is written to
disk or logged. Responses carry Cache-Control: no-store.
"""
import time
import uuid

from flask import Flask, jsonify, render_template, request

from .checks import DocumentCheck, FaceLivenessCheck, ModalityResult, VoiceCheck
from .config import Config
from .fusion import fuse
from .validation import InputError, load_image, load_wav

FIELDS = {"face": "selfie", "document": "document", "voice": "voice", "voice_deepfake": "voice"}


def default_checks(cfg):
    checks = {"face": FaceLivenessCheck(cfg), "document": DocumentCheck(cfg), "voice": VoiceCheck(cfg)}
    if cfg.voice_deepfake_model_path is not None:
        from .checks.voice_deepfake import VoiceDeepfakeCheck
        checks["voice_deepfake"] = VoiceDeepfakeCheck(cfg)
    return checks


def create_app(cfg=None, checks=None):
    cfg = cfg or Config.from_env()
    app = Flask(__name__)
    app.config["MAX_CONTENT_LENGTH"] = 2 * cfg.max_image_bytes + cfg.max_audio_bytes + 256 * 1024
    app.extensions["humanauth"] = {"cfg": cfg, "checks": checks or default_checks(cfg)}

    def _checks():
        return app.extensions["humanauth"]["checks"]

    @app.after_request
    def _no_store(resp):
        resp.headers["Cache-Control"] = "no-store"
        resp.headers["X-Content-Type-Options"] = "nosniff"
        return resp

    @app.errorhandler(413)
    def _too_large(_):
        return jsonify(error="request_too_large",
                       message="Upload is too large. Images up to "
                               f"{cfg.max_image_bytes // 2**20} MB, voice up to {cfg.max_audio_bytes // 2**20} MB."), 413

    @app.get("/")
    def index():
        return render_template("index.html")

    @app.get("/api/health")
    def health():
        checks = _checks()
        modules = {name: c.availability() for name, c in checks.items()}
        voice = checks.get("voice")
        return jsonify(status="ok", modules=modules,
                       enrolled_speakers=voice.enrolled() if hasattr(voice, "enrolled") else [],
                       limits={"max_image_bytes": cfg.max_image_bytes, "max_audio_bytes": cfg.max_audio_bytes,
                               "min_audio_seconds": cfg.min_audio_seconds,
                               "max_audio_seconds": cfg.max_audio_seconds},
                       stores_uploads=False)

    @app.post("/api/verify")
    def verify():
        t0 = time.perf_counter()
        checks = _checks()
        files = request.files
        claimed = (request.form.get("claimed_identity") or "").strip() or None
        inputs = {}
        try:
            if files.get("selfie"):
                inputs["face"] = load_image("selfie", files["selfie"].read(), cfg)
            if files.get("document"):
                inputs["document"] = load_image("document", files["document"].read(), cfg)
            if files.get("voice"):
                rate, audio = load_wav("voice", files["voice"].read(), cfg)
                voice = checks.get("voice")
                enrolled = voice.enrolled() if hasattr(voice, "enrolled") else []
                if enrolled:
                    if not claimed:
                        raise InputError("claimed_identity", "Choose which enrolled person you are.")
                    if claimed not in enrolled:
                        raise InputError("claimed_identity", "Unknown identity.")
                inputs["voice"] = (rate, audio, claimed)
                if "voice_deepfake" in checks:
                    inputs["voice_deepfake"] = (rate, audio)
        except InputError as e:
            return jsonify(error="invalid_input", field=e.field, message=e.message), 400
        if not inputs:
            return jsonify(error="invalid_input", field=None,
                           message="Upload at least one of: selfie, document, voice."), 400

        results = []
        for name in checks:
            if name in inputs:
                results.append(checks[name].run(inputs[name]))
            else:
                results.append(ModalityResult(name, "not_provided", detail=f"No {FIELDS[name]} uploaded."))
        inputs.clear()  # drop biometric data as soon as it is scored

        out = fuse(results, cfg)
        out["request_id"] = uuid.uuid4().hex
        out["modalities"] = {r.name: r.to_dict() for r in results}
        out["latency_ms"] = round((time.perf_counter() - t0) * 1000, 1)
        out["stored"] = False
        return jsonify(out)

    return app
