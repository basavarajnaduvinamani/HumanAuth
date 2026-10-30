import pytest

from gateway.validation import InputError, load_image, load_wav

from conftest import make_jpeg, make_png, make_wav


def test_jpeg_and_png_decode_to_rgb(cfg):
    for data in (make_jpeg(80, 60), make_png(80, 60)):
        img = load_image("selfie", data, cfg)
        assert img.shape == (60, 80, 3) and img.dtype.name == "uint8"


@pytest.mark.parametrize("data, msg", [
    (b"", "empty"),
    (b"GIF89a" + b"\0" * 100, "Unsupported image type"),
    (b"\xff\xd8\xff" + b"garbage" * 10, "could not be decoded"),
])
def test_bad_images_rejected(cfg, data, msg):
    with pytest.raises(InputError, match=msg):
        load_image("selfie", data, cfg)


def test_image_size_limits(cfg):
    cfg.max_image_bytes = 100
    with pytest.raises(InputError, match="larger than"):
        load_image("document", make_jpeg(), cfg)


def test_image_dimension_limits(cfg):
    with pytest.raises(InputError, match="too small"):
        load_image("selfie", make_jpeg(20, 20), cfg)
    cfg.max_image_side = 50
    with pytest.raises(InputError, match="px on a side"):
        load_image("selfie", make_jpeg(64, 48), cfg)


def test_wav_mono_and_stereo(cfg):
    rate, a = load_wav("voice", make_wav(channels=1), cfg)
    assert rate == 16000 and a.ndim == 1
    rate, a = load_wav("voice", make_wav(channels=2, rate=44100), cfg)
    assert rate == 44100 and a.shape[1] == 2


@pytest.mark.parametrize("kw, msg", [
    ({"seconds": 0.3}, "shorter"),
    ({"seconds": 25}, "longer"),
    ({"silent": True}, "silent"),
    ({"width": 1}, "16-bit"),
])
def test_bad_wavs_rejected(cfg, kw, msg):
    with pytest.raises(InputError, match=msg):
        load_wav("voice", make_wav(**kw), cfg)


def test_non_wav_rejected(cfg):
    with pytest.raises(InputError, match="WAV"):
        load_wav("voice", b"OggS" + b"\0" * 100, cfg)
