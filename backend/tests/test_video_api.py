from pathlib import Path

from fastapi.testclient import TestClient
from test_video import analyzer_fixture, encoded_clip

from climbing_monkey.main import create_app


def video_client(tmp_path):
    analyzer, detector = analyzer_fixture(tmp_path)
    client = TestClient(
        create_app(database_path=tmp_path / "video.sqlite3", video_analyzer=analyzer)
    )
    token = client.post("/v1/climbers", json={"name": "Video Monkey"}).json()["token"]
    return client, {"Authorization": f"Bearer {token}"}, detector


def test_video_upload_decodes_real_clip_and_stays_transient(tmp_path):
    client, auth, detector = video_client(tmp_path)
    response = client.post(
        "/v1/pose/video",
        headers=auth,
        data={"upload_consent": "true"},
        files={"file": ("capture.mp4", encoded_clip(), "video/mp4")},
    )

    assert response.status_code == 200
    assert response.json()["sampled_frame_count"] == 3
    assert client.get("/v1/me/assessments", headers=auth).json() == []
    assert client.get("/v1/me/photos", headers=auth).json() == []
    assert detector.closed


def test_video_upload_requires_identity(tmp_path):
    client, _, detector = video_client(tmp_path)
    response = client.post(
        "/v1/pose/video",
        data={"upload_consent": "true"},
        files={"file": ("capture.mp4", encoded_clip(), "video/mp4")},
    )
    assert response.status_code == 401
    assert not detector.timestamps


def test_video_upload_requires_explicit_consent(tmp_path):
    client, auth, detector = video_client(tmp_path)
    response = client.post(
        "/v1/pose/video",
        headers=auth,
        files={"file": ("capture.mp4", encoded_clip(), "video/mp4")},
    )
    assert response.status_code == 403
    assert not detector.timestamps


def test_bad_video_returns_400_and_removes_transient_file(tmp_path):
    seen = []

    class Analyzer:
        def analyze(self, path):
            seen.append(Path(path))
            assert Path(path).read_bytes() == b"invalid"
            raise ValueError("Invalid video")

    client = TestClient(
        create_app(database_path=tmp_path / "bad.sqlite3", video_analyzer=Analyzer())
    )
    token = client.post("/v1/climbers", json={"name": "Video Monkey"}).json()["token"]
    response = client.post(
        "/v1/pose/video",
        headers={"Authorization": f"Bearer {token}"},
        data={"upload_consent": "true"},
        files={"file": ("bad.mp4", b"invalid", "video/mp4")},
    )
    assert response.status_code == 400
    assert seen and all(not path.exists() for path in seen)


def test_video_runtime_failure_returns_unavailable(tmp_path):
    class Analyzer:
        def analyze(self, path):
            raise RuntimeError("runtime failed")

    client = TestClient(
        create_app(database_path=tmp_path / "down.sqlite3", video_analyzer=Analyzer())
    )
    token = client.post("/v1/climbers", json={"name": "Video Monkey"}).json()["token"]
    response = client.post(
        "/v1/pose/video",
        headers={"Authorization": f"Bearer {token}"},
        data={"upload_consent": "true"},
        files={"file": ("clip.mp4", encoded_clip(), "video/mp4")},
    )
    assert response.status_code == 503


def test_unconfigured_video_analyzer_returns_503(client, auth):
    response = client.post(
        "/v1/pose/video",
        headers=auth,
        data={"upload_consent": "true"},
        files={"file": ("clip.mp4", encoded_clip(), "video/mp4")},
    )
    assert response.status_code == 503


def test_video_upload_size_is_bounded_before_inference(tmp_path, monkeypatch):
    import climbing_monkey.video_routes as routes

    monkeypatch.setattr(routes, "MAX_VIDEO_BYTES", 32, raising=False)
    client, auth, detector = video_client(tmp_path)
    response = client.post(
        "/v1/pose/video",
        headers=auth,
        data={"upload_consent": "true"},
        files={"file": ("clip.mp4", encoded_clip(), "video/mp4")},
    )
    assert response.status_code == 413
    assert not detector.timestamps


def test_live_socket_returns_tracked_results_after_consented_handshake(tmp_path):
    from io import BytesIO

    from PIL import Image

    client, auth, detector = video_client(tmp_path)
    jpeg = BytesIO()
    Image.new("RGB", (64, 48), "green").save(jpeg, format="JPEG")
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json(
            {"type": "start", "token": auth["Authorization"][7:], "upload_consent": True}
        )
        ready = socket.receive_json()
        assert ready["type"] == "ready"
        assert ready["max_frame_bytes"] == 8 * 1024 * 1024
        for timestamp in (100, 300):
            socket.send_json({"type": "frame", "timestamp_ms": timestamp})
            socket.send_bytes(jpeg.getvalue())
            result = socket.receive_json()
            assert result["type"] == "result"
            assert result["timestamp_ms"] == timestamp
            assert result["status"] == "ok"
        socket.send_json({"type": "stop"})
    assert detector.timestamps == [100, 300]
    assert detector.closed
    assert client.get("/v1/me/assessments", headers=auth).json() == []


def test_live_socket_rejects_wrong_token_before_inference(tmp_path):
    client, _, detector = video_client(tmp_path)
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json({"type": "start", "token": "wrong", "upload_consent": True})
        assert socket.receive_json()["type"] == "error"
        assert socket.receive()["code"] == 1008
    assert not detector.timestamps
    assert not detector.closed


def test_live_socket_requires_literal_consent_true(tmp_path):
    client, auth, detector = video_client(tmp_path)
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json(
            {"type": "start", "token": auth["Authorization"][7:], "upload_consent": "true"}
        )
        assert socket.receive_json()["type"] == "error"
        assert socket.receive()["code"] == 1008
    assert not detector.closed


def test_live_disconnect_closes_detector_without_server_error(tmp_path):
    client, auth, detector = video_client(tmp_path)
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json(
            {"type": "start", "token": auth["Authorization"][7:], "upload_consent": True}
        )
        assert socket.receive_json()["type"] == "ready"
    assert detector.closed


def test_live_bad_timestamp_returns_error_and_closes_detector(tmp_path):
    from io import BytesIO

    from PIL import Image

    client, auth, detector = video_client(tmp_path)
    jpeg = BytesIO()
    Image.new("RGB", (64, 48), "green").save(jpeg, format="JPEG")
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json(
            {"type": "start", "token": auth["Authorization"][7:], "upload_consent": True}
        )
        socket.receive_json()
        socket.send_json({"type": "frame", "timestamp_ms": -1})
        socket.send_bytes(jpeg.getvalue())
        assert socket.receive_json()["type"] == "error"
        assert socket.receive()["code"] == 1008
    assert detector.closed
    assert not detector.timestamps


def test_live_unavailable_runtime_returns_error_and_closes_socket(tmp_path):
    from contextlib import contextmanager

    class Analyzer:
        @contextmanager
        def session(self):
            raise RuntimeError("native unavailable")
            yield

    client = TestClient(
        create_app(database_path=tmp_path / "socket.sqlite3", video_analyzer=Analyzer())
    )
    token = client.post("/v1/climbers", json={"name": "Video Monkey"}).json()["token"]
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json({"type": "start", "token": token, "upload_consent": True})
        assert socket.receive_json()["type"] == "error"
        assert socket.receive()["code"] == 1011


def test_live_malformed_handshake_is_policy_error(tmp_path):
    client, _, detector = video_client(tmp_path)
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json([])
        assert socket.receive_json()["type"] == "error"
        assert socket.receive()["code"] == 1008
    assert not detector.closed


def test_live_missing_token_is_policy_error(tmp_path):
    client, _, detector = video_client(tmp_path)
    with client.websocket_connect("/v1/pose/stream?token=wrong") as socket:
        socket.send_json({"type": "start", "upload_consent": True})
        assert socket.receive_json()["type"] == "error"
        assert socket.receive()["code"] == 1008
    assert not detector.closed


def test_live_binary_instead_of_start_message_is_policy_error(tmp_path):
    client, _, detector = video_client(tmp_path)
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_bytes(b"bad")
        assert socket.receive_json()["type"] == "error"
        assert socket.receive()["code"] == 1008
    assert not detector.closed


def test_live_control_message_size_is_bounded(tmp_path):
    client, auth, detector = video_client(tmp_path)
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json(
            {
                "type": "start",
                "token": auth["Authorization"][7:],
                "upload_consent": True,
                "padding": "x" * 2048,
            }
        )
        assert socket.receive_json()["type"] == "error"
        assert socket.receive()["code"] == 1008
    assert not detector.closed


def test_live_missing_frame_timestamp_is_policy_error(tmp_path):
    client, auth, detector = video_client(tmp_path)
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json(
            {"type": "start", "token": auth["Authorization"][7:], "upload_consent": True}
        )
        socket.receive_json()
        socket.send_json({"type": "frame"})
        assert socket.receive_json()["type"] == "error"
        assert socket.receive()["code"] == 1008
    assert detector.closed


def test_live_text_instead_of_binary_jpeg_is_policy_error(tmp_path):
    client, auth, detector = video_client(tmp_path)
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json(
            {"type": "start", "token": auth["Authorization"][7:], "upload_consent": True}
        )
        socket.receive_json()
        socket.send_json({"type": "frame", "timestamp_ms": 100})
        socket.send_text("not jpeg bytes")
        assert socket.receive_json()["type"] == "error"
        assert socket.receive()["code"] == 1008
    assert detector.closed


def test_live_bad_jpeg_is_policy_error_not_runtime_failure(tmp_path):
    client, auth, detector = video_client(tmp_path)
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json(
            {"type": "start", "token": auth["Authorization"][7:], "upload_consent": True}
        )
        socket.receive_json()
        socket.send_json({"type": "frame", "timestamp_ms": 100})
        socket.send_bytes(b"not an image")
        assert socket.receive_json()["type"] == "error"
        assert socket.receive()["code"] == 1008
    assert detector.closed


def test_live_idle_receive_timeout_is_enforced(monkeypatch):
    import asyncio

    import pytest

    import climbing_monkey.video_routes as routes

    monkeypatch.setattr(routes, "MESSAGE_TIMEOUT_SECONDS", 0.01, raising=False)

    class SlowSocket:
        async def receive(self):
            await asyncio.sleep(0.05)
            return {"type": "websocket.receive", "text": '{"type":"start"}'}

    with pytest.raises(TimeoutError):
        asyncio.run(routes._receive_json(SlowSocket()))


def test_live_handshake_timeout_closes_connection_without_detector(tmp_path, monkeypatch):
    import climbing_monkey.video_routes as routes

    monkeypatch.setattr(routes, "MESSAGE_TIMEOUT_SECONDS", 0.02)
    client, _, detector = video_client(tmp_path)
    with client.websocket_connect("/v1/pose/stream") as socket:
        assert socket.receive_json()["type"] == "error"
        assert socket.receive()["code"] == 1008
    assert not detector.closed


def test_live_inference_and_detector_lifecycle_run_outside_event_loop(tmp_path):
    import asyncio
    from contextlib import contextmanager

    class Analyzer:
        @contextmanager
        def session(self):
            with __import__("pytest").raises(RuntimeError, match="no running event loop"):
                asyncio.get_running_loop()
            yield self
            with __import__("pytest").raises(RuntimeError, match="no running event loop"):
                asyncio.get_running_loop()

        def analyze_frame(self, data, timestamp_ms):
            with __import__("pytest").raises(RuntimeError, match="no running event loop"):
                asyncio.get_running_loop()
            return {"status": "invalid_capture", "value": None}

    client = TestClient(
        create_app(database_path=tmp_path / "thread.sqlite3", video_analyzer=Analyzer())
    )
    token = client.post("/v1/climbers", json={"name": "Video Monkey"}).json()["token"]
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json({"type": "start", "token": token, "upload_consent": True})
        socket.receive_json()
        socket.send_json({"type": "frame", "timestamp_ms": 100})
        socket.send_bytes(b"fixture; image decoding replaced only in thread characterization")
        assert socket.receive_json()["type"] == "result"
        socket.send_json({"type": "stop"})


def test_live_empty_frame_message_is_policy_error(tmp_path):
    client, auth, detector = video_client(tmp_path)
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json(
            {"type": "start", "token": auth["Authorization"][7:], "upload_consent": True}
        )
        socket.receive_json()
        socket.send_json({})
        assert socket.receive_json()["type"] == "error"
        assert socket.receive()["code"] == 1008
    assert detector.closed


def test_deleted_owner_cannot_submit_another_live_frame(tmp_path):
    from io import BytesIO

    from PIL import Image

    client, auth, detector = video_client(tmp_path)
    jpeg = BytesIO()
    Image.new("RGB", (64, 48), "green").save(jpeg, format="JPEG")
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json(
            {"type": "start", "token": auth["Authorization"][7:], "upload_consent": True}
        )
        assert socket.receive_json()["type"] == "ready"
        assert client.delete("/v1/me", headers=auth).status_code == 204
        assert client.get("/v1/me", headers=auth).status_code == 401
        socket.send_json({"type": "frame", "timestamp_ms": 100})
        socket.send_bytes(jpeg.getvalue())
        assert socket.receive_json()["type"] == "error"
        assert socket.receive()["code"] == 1008
    assert not detector.timestamps
    assert detector.closed
