import hashlib
import pytest
from scripts.privacy_guard import violations


@pytest.mark.parametrize("path,data,expected", [
    ("public/new.wav", b"not even valid audio", "audio/video asset"),
    ("public/innocent.bin", b"RIFF0000WAVEpayload", "audio/video asset"),
    ("public/recordings/data.txt", b"x", "private-data path"),
    ("public/face_database/a.json", b"{}", "private-data path"),
    ("public/speaker.gmm", b"x", "serialized enrollment/raw feature asset"),
    ("public/portrait.png", b"new image", "raster image lacks reviewed provenance hash"),
    ("public/page.html", b'<audio src="data:audio/wav;base64,' + b'A'*100, "embedded media payload"),
    ("book.ipynb", b'{"cells":[{"outputs":[{"data":{"image/png":"abc"}}]}]}', "notebook media output"),
])
def test_private_assets_are_refused(path, data, expected):
    assert expected in violations(path, data, {})


def test_private_hash_is_refused_even_under_a_new_filename():
    data = b"a private template"
    assert "known private biometric content" in violations("renamed.bin", data, {"private_sha256": [hashlib.sha256(data).hexdigest()]})


def test_reviewed_synthetic_image_is_allowed_but_changes_are_refused():
    data = b"reviewed synthetic image"
    policy = {"images": [{"sha256": hashlib.sha256(data).hexdigest()}]}
    assert violations("public/synthetic.png", data, policy) == []
    assert violations("public/synthetic.png", data + b"changed", policy)


def test_code_and_public_document_annotations_are_allowed():
    assert violations("dataset/labels/a.txt", b"0 0.5 0.5 1 1", {}) == []
    assert violations("src/speech.ts", b'const mime = "audio/wav";', {}) == []
