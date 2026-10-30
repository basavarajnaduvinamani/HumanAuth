"""Input validation for uploaded images and voice clips.

Everything is decoded in memory. Nothing here writes to disk.
"""
import io
import wave

import numpy as np
from PIL import Image, UnidentifiedImageError

IMAGE_MAGIC = {
    b"\xff\xd8\xff": "jpeg",
    b"\x89PNG\r\n\x1a\n": "png",
}


class InputError(ValueError):
    """Raised for a bad upload. The message is safe to show to the user."""

    def __init__(self, field, message):
        super().__init__(message)
        self.field = field
        self.message = message


def _sniff_image(data):
    for magic, kind in IMAGE_MAGIC.items():
        if data.startswith(magic):
            return kind
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def load_image(field, data, cfg):
    """Return an RGB uint8 array (H, W, 3) or raise InputError."""
    if not data:
        raise InputError(field, "File is empty.")
    if len(data) > cfg.max_image_bytes:
        raise InputError(field, f"Image is larger than {cfg.max_image_bytes // (1024 * 1024)} MB.")
    if _sniff_image(data) is None:
        raise InputError(field, "Unsupported image type. Use JPEG, PNG or WebP.")
    try:
        img = Image.open(io.BytesIO(data))
        w, h = img.size
        if max(w, h) > cfg.max_image_side:
            raise InputError(field, f"Image is larger than {cfg.max_image_side} px on a side.")
        if min(w, h) < 32:
            raise InputError(field, "Image is too small (under 32 px on a side).")
        img = img.convert("RGB")
    except InputError:
        raise
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        raise InputError(field, "Image could not be decoded.")
    return np.asarray(img)


def load_wav(field, data, cfg):
    """Return (sample_rate, int16 array of shape (N,) or (N, channels))."""
    if not data:
        raise InputError(field, "File is empty.")
    if len(data) > cfg.max_audio_bytes:
        raise InputError(field, f"Voice clip is larger than {cfg.max_audio_bytes // (1024 * 1024)} MB.")
    if not (data[:4] == b"RIFF" and data[8:12] == b"WAVE"):
        raise InputError(field, "Unsupported audio type. Upload a WAV file (16-bit PCM).")
    try:
        with wave.open(io.BytesIO(data), "rb") as w:
            channels, width, rate, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
            frames = w.readframes(n)
    except (wave.Error, EOFError):
        raise InputError(field, "WAV file could not be decoded (16-bit PCM only).")
    if width != 2:
        raise InputError(field, "WAV must be 16-bit PCM.")
    if channels not in (1, 2) or not (8000 <= rate <= 96000):
        raise InputError(field, "WAV must be mono or stereo, 8-96 kHz.")
    audio = np.frombuffer(frames, dtype="<i2")
    if channels == 2:
        audio = audio[: len(audio) // 2 * 2].reshape(-1, 2)
    seconds = audio.shape[0] / rate
    if seconds < cfg.min_audio_seconds:
        raise InputError(field, f"Voice clip is shorter than {cfg.min_audio_seconds:g} s.")
    if seconds > cfg.max_audio_seconds:
        raise InputError(field, f"Voice clip is longer than {cfg.max_audio_seconds:g} s.")
    if not np.any(audio):
        raise InputError(field, "Voice clip is silent.")
    return rate, audio
