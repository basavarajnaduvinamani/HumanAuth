"""Gateway HTTP behaviour with stubbed models."""
import io

from conftest import make_jpeg


def post(client, data):
    return client.post("/api/verify", data=data, content_type="multipart/form-data")


def test_health_reports_modules_and_no_storage(make_client):
    client, _ = make_client(document_unavailable="Document classifier weights not found")
    h = client.get("/api/health").get_json()
    assert h["modules"]["face"]["available"] is True
    assert h["modules"]["document"] == {"available": False, "reason": "Document classifier weights not found"}
    assert h["enrolled_speakers"] == ["Alice", "Bob"]
    assert h["stores_uploads"] is False


def test_full_verify_approves(make_client, full_upload):
    client, checks = make_client()
    r = post(client, full_upload())
    assert r.status_code == 200
    body = r.get_json()
    assert body["decision"] == "approve"
    assert set(body["modalities"]) == {"face", "document", "voice"}
    assert body["modalities"]["face"]["status"] == "ok"
    assert body["stored"] is False
    assert r.headers["Cache-Control"] == "no-store"
    # each check got decoded input exactly once
    assert all(len(c.calls) == 1 for c in checks.values())
    rate, audio, claimed = checks["voice"].calls[0]
    assert claimed == "Alice" and rate == 16000


def test_spoof_selfie_vetoes(make_client, full_upload):
    client, _ = make_client(face=0.1)
    body = post(client, full_upload()).get_json()
    assert body["decision"] == "reject" and body["liveness_veto"] is True


def test_missing_module_returns_clear_unavailable(make_client, full_upload):
    client, _ = make_client(document_unavailable="Document classifier (forgery_classifier.pth) weights not found at x")
    body = post(client, full_upload()).get_json()
    doc = body["modalities"]["document"]
    assert doc["status"] == "unavailable" and "weights not found" in doc["detail"]
    assert body["decision"] == "review"


def test_inference_crash_is_reported_not_raised(make_client, full_upload):
    client, _ = make_client(document_raises=True)
    r = post(client, full_upload())
    assert r.status_code == 200
    assert r.get_json()["modalities"]["document"]["status"] == "error"
    assert r.get_json()["decision"] == "review"


def test_partial_upload_goes_to_review(make_client):
    client, checks = make_client()
    body = post(client, {"selfie": (io.BytesIO(make_jpeg()), "s.jpg")}).get_json()
    assert body["decision"] == "review"
    assert body["modalities"]["voice"]["status"] == "not_provided"
    assert checks["voice"].calls == []


def test_empty_request_is_400(make_client):
    client, _ = make_client()
    r = post(client, {})
    assert r.status_code == 400 and r.get_json()["error"] == "invalid_input"


def test_bad_image_names_the_field(make_client, full_upload):
    client, checks = make_client()
    r = post(client, full_upload(document=(io.BytesIO(b"not an image"), "d.png")))
    assert r.status_code == 400
    assert r.get_json()["field"] == "document"
    assert all(c.calls == [] for c in checks.values())


def test_voice_requires_known_claimed_identity(make_client, full_upload):
    client, _ = make_client()
    r = post(client, full_upload(claimed_identity=None))
    assert r.status_code == 400 and r.get_json()["field"] == "claimed_identity"
    r = post(client, full_upload(claimed_identity="Mallory"))
    assert r.status_code == 400 and r.get_json()["message"] == "Unknown identity."


def test_oversized_request_is_413_json(make_client, cfg):
    cfg.max_image_bytes = 1024
    cfg.max_audio_bytes = 1024
    client, _ = make_client()
    big = io.BytesIO(b"\xff\xd8\xff" + b"0" * 400_000)
    r = post(client, {"selfie": (big, "big.jpg")})
    assert r.status_code == 413
    assert r.get_json()["error"] == "request_too_large"


def test_index_page_renders(make_client):
    client, _ = make_client()
    r = client.get("/")
    assert r.status_code == 200 and b"Verify your identity" in r.data and b"Privacy" in r.data


def test_no_files_written(make_client, full_upload, tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    client, _ = make_client()
    post(client, full_upload())
    assert list(tmp_path.iterdir()) == []
