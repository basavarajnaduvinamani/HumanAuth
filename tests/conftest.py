"""Shared fixtures: tiny synthetic inputs and stub checks (no camera, no network, no weights)."""
import io
import sys
import wave
from pathlib import Path

import numpy as np
import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gateway import create_app  # noqa: E402
from gateway.checks.base import Check, ModuleUnavailable  # noqa: E402
from gateway.config import Config  # noqa: E402


def make_jpeg(w=64, h=48, color=(120, 140, 160)):
    buf = io.BytesIO()
    Image.new("RGB", (w, h), color).save(buf, "JPEG")
    return buf.getvalue()


def make_png(w=64, h=48):
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (10, 200, 30)).save(buf, "PNG")
    return buf.getvalue()


def make_wav(seconds=1.5, rate=16000, channels=1, freq=220.0, silent=False, width=2):
    t = np.arange(int(seconds * rate)) / rate
    x = np.zeros_like(t) if silent else 0.3 * np.sin(2 * np.pi * freq * t) + 0.05 * np.sin(2 * np.pi * 3.1 * freq * t)
    pcm = (x * 32767).astype("<i2")
    if channels == 2:
        pcm = np.repeat(pcm[:, None], 2, axis=1).ravel()
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(width)
        w.setframerate(rate)
        if width == 2:
            w.writeframes(pcm.tobytes())
        else:
            w.writeframes((pcm // 256).astype(np.int8).tobytes())
    return buf.getvalue()


class StubCheck(Check):
    """Returns a fixed score; records whether it was called."""

    def __init__(self, cfg, name, score=0.9, threshold=0.5, unavailable=None, raises=False, speakers=None):
        super().__init__(cfg)
        self.name = name
        self.fixed = score
        self._thr = threshold
        self.unavailable = unavailable
        self.raises = raises
        self.speakers = speakers
        self.calls = []

    @property
    def threshold(self):
        return self._thr

    def _load(self):
        if self.unavailable:
            raise ModuleUnavailable(self.unavailable)

    def _run(self, inputs):
        self.calls.append(inputs)
        if self.raises:
            raise RuntimeError("boom")
        passed = self.fixed >= self._thr
        return self.fixed, passed, "pass" if passed else "fail", f"stub {self.name} {self.fixed:.2f}", {}

    def enrolled(self):
        return list(self.speakers or [])


@pytest.fixture
def cfg():
    return Config()


@pytest.fixture
def make_client(cfg):
    def _make(face=0.9, document=0.9, voice=0.9, **kw):
        checks = {
            "face": StubCheck(cfg, "face", face, unavailable=kw.get("face_unavailable")),
            "document": StubCheck(cfg, "document", document, unavailable=kw.get("document_unavailable"),
                                  raises=kw.get("document_raises", False)),
            "voice": StubCheck(cfg, "voice", voice, speakers=kw.get("speakers", ["Alice", "Bob"])),
        }
        app = create_app(cfg, checks=checks)
        app.testing = True
        return app.test_client(), checks
    return _make


@pytest.fixture
def full_upload():
    def _f(**override):
        data = {
            "selfie": (io.BytesIO(make_jpeg()), "selfie.jpg"),
            "document": (io.BytesIO(make_png()), "doc.png"),
            "voice": (io.BytesIO(make_wav()), "voice.wav"),
            "claimed_identity": "Alice",
        }
        data.update(override)
        return {k: v for k, v in data.items() if v is not None}
    return _f
