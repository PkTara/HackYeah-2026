def test_landmark_api_estimates_visible_leg_angle_without_saving_it(client, auth):
    landmarks = [{"x": 0.5, "y": 0.25, "visibility": 1.0} for _ in range(33)]
    landmarks[27] = {"x": 0.0, "y": 0.75, "visibility": 1.0}
    landmarks[28] = {"x": 1.0, "y": 0.75, "visibility": 1.0}
    response = client.post(
        "/v1/pose/landmarks",
        headers=auth,
        json={"landmarks": landmarks, "image_width": 100, "image_height": 100},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert abs(response.json()["value"] - 90) < 0.001
    assert client.get("/v1/me/assessments", headers=auth).json() == []


def test_image_analysis_requires_explicit_upload_consent(client, auth):
    response = client.post(
        "/v1/pose/image", headers=auth, files={"file": ("hand.jpg", b"image", "image/jpeg")}
    )
    assert response.status_code == 403


def test_consented_image_uses_injected_inference_and_stays_transient(tmp_path, image_bytes):
    from io import BytesIO

    from fastapi.testclient import TestClient
    from PIL import Image

    from climbing_monkey.main import create_app

    class Analyzer:
        def analyze(self, data):
            assert Image.open(BytesIO(data)).size == (32, 24)
            return {
                "status": "ok",
                "metric": "leg_spread",
                "value": 90.0,
                "unit": "degrees",
                "confidence": 0.95,
                "reason": None,
                "method": "camera",
                "protocol": "front-facing-leg-spread-v1",
            }

    with TestClient(
        create_app(database_path=tmp_path / "pose.sqlite3", pose_analyzer=Analyzer())
    ) as client:
        token = client.post("/v1/climbers", json={"name": "Pose Monkey"}).json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        response = client.post(
            "/v1/pose/image",
            headers=headers,
            data={"upload_consent": "true"},
            files={"file": ("pose.png", image_bytes, "image/png")},
        )
        assert response.status_code == 200
        assert response.json()["value"] == 90
        assert client.get("/v1/me/assessments", headers=headers).json() == []


def test_configured_but_missing_model_returns_unavailable(
    client, auth, image_bytes, monkeypatch, tmp_path
):
    monkeypatch.setenv("POSE_MODEL_PATH", str(tmp_path / "missing.task"))
    response = client.post(
        "/v1/pose/image",
        headers=auth,
        data={"upload_consent": "true"},
        files={"file": ("pose.png", image_bytes, "image/png")},
    )
    assert response.status_code == 503


def test_inference_value_error_returns_a_clear_bad_capture(tmp_path, image_bytes):
    from fastapi.testclient import TestClient

    from climbing_monkey.main import create_app

    class Analyzer:
        def analyze(self, data):
            raise ValueError("Cannot decode frame")

    app = create_app(database_path=tmp_path / "bad-pose.sqlite3", pose_analyzer=Analyzer())
    with TestClient(app) as client:
        token = client.post("/v1/climbers", json={"name": "Pose Monkey"}).json()["token"]
        response = client.post(
            "/v1/pose/image",
            headers={"Authorization": f"Bearer {token}"},
            data={"upload_consent": "true"},
            files={"file": ("pose.png", image_bytes, "image/png")},
        )
        assert response.status_code == 400


def test_missing_landmark_visibility_is_not_assumed_fully_confident(client, auth):
    landmarks = [{"x": 0.5, "y": 0.25} for _ in range(33)]
    landmarks[27] = {"x": 0.0, "y": 0.75}
    landmarks[28] = {"x": 1.0, "y": 0.75}
    response = client.post("/v1/pose/landmarks", headers=auth, json={"landmarks": landmarks})
    assert response.status_code == 422
