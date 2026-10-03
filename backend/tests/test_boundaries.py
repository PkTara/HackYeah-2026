import pytest


@pytest.mark.parametrize(
    "path",
    [
        "/v1/me",
        "/v1/me/climbs",
        "/v1/me/assessments",
        "/v1/me/hands",
        "/v1/me/activities",
        "/v1/me/profile",
        "/v1/me/quests",
        "/v1/me/pet",
        "/v1/me/photos",
        "/v1/me/export",
        "/v1/me/hands/heatmap",
    ],
)
def test_personal_reads_require_valid_credentials(client, path):
    assert client.get(path).status_code == 401
    assert client.get(path, headers={"Authorization": "Bearer invalid"}).status_code == 401


@pytest.mark.parametrize(
    ("kind", "payload"),
    [
        ("climbs", {"terrain": "roof", "movement": "dynamic", "completed": True, "attempts": 1}),
        ("climbs", {"terrain": "slab", "movement": "controlled", "completed": True, "attempts": 0}),
        (
            "climbs",
            {"terrain": "slab", "movement": "controlled", "completed": True, "attempts": 1001},
        ),
        ("climbs", {"terrain": "slab", "completed": True, "attempts": 1}),
        ("climbs", {"terrain": "slab", "movements": [], "completed": True, "attempts": 1}),
        (
            "climbs",
            {
                "terrain": "slab",
                "movements": ["dynamic", "dynamic"],
                "completed": True,
                "attempts": 1,
            },
        ),
        (
            "climbs",
            {
                "terrain": "slab",
                "movements": ["dynamic", "controlled", "dynamic"],
                "completed": True,
                "attempts": 1,
            },
        ),
        (
            "climbs",
            {"terrain": "slab", "movements": ["crimpy"], "completed": True, "attempts": 1},
        ),
        (
            "climbs",
            {
                "terrain": "slab",
                "movement": "controlled",
                "movements": ["dynamic"],
                "completed": True,
                "attempts": 1,
            },
        ),
        (
            "climbs",
            {
                "terrain": "slab",
                "movement": "controlled",
                "holds": ["jug", "jug"],
                "completed": True,
                "attempts": 1,
            },
        ),
        (
            "climbs",
            {
                "terrain": "slab",
                "movement": "controlled",
                "holds": ["crack"],
                "completed": True,
                "attempts": 1,
            },
        ),
        ("hands", {"side": "left", "region": "ring_finger", "pain": 11}),
        ("hands", {"side": "right", "region": "palm", "pain": -1}),
        ("hands", {"side": "left", "region": "ring_finger", "pain": 2, "spots": ["A2"]}),
        ("hands", {"side": "left", "region": "ring_finger", "pain": 2, "spots": [""]}),
        ("hands", {"side": "left", "region": "ring_finger", "pain": 2, "spots": ["a" * 33]}),
        ("hands", {"side": "left", "region": "ring_finger", "pain": 2, "spots": ["a2", "a2"]}),
        (
            "hands",
            {
                "side": "left",
                "region": "ring_finger",
                "pain": 2,
                "spots": [f"spot-{index}" for index in range(25)],
            },
        ),
        ("activities", {"kind": "climbing", "duration_minutes": 0}),
        ("activities", {"kind": "climbing", "duration_minutes": 30, "source": "strava"}),
        (
            "assessments",
            {
                "metric": "leg_spread",
                "value": "NaN",
                "unit": "degrees",
                "method": "manual",
                "protocol": "front-facing",
            },
        ),
        (
            "climbs",
            {
                "terrain": "slab",
                "movement": "controlled",
                "completed": True,
                "attempts": 1,
                "occurred_at": "2026-10-03T10:00:00",
            },
        ),
        (
            "climbs",
            {
                "terrain": "slab",
                "movement": "controlled",
                "completed": True,
                "attempts": 1,
                "owner": "somebody-else",
            },
        ),
    ],
)
def test_invalid_evidence_is_rejected_without_persistence(client, auth, kind, payload):
    assert client.post(f"/v1/me/{kind}", headers=auth, json=payload).status_code == 422
    assert client.get(f"/v1/me/{kind}", headers=auth).json() == []


def test_identity_rejects_blank_name_and_unknown_goal(client):
    assert client.post("/v1/climbers", json={"name": "  "}).status_code == 422
    assert (
        client.post("/v1/climbers", json={"name": "Monkey", "goal": "diagnosis"}).status_code == 422
    )


def test_other_identity_cannot_read_or_delete_records_photos_or_quests(client, auth, image_bytes):
    climb = client.post(
        "/v1/me/climbs",
        headers=auth,
        json={"terrain": "slab", "movement": "controlled", "completed": True, "attempts": 1},
    ).json()
    photo = client.post(
        "/v1/me/photos",
        headers=auth,
        data={"upload_consent": "true", "retain_consent": "true", "side": "right", "view": "palm"},
        files={"file": ("hand.png", image_bytes, "image/png")},
    ).json()
    quest = client.post("/v1/me/quests", headers=auth).json()
    other = client.post("/v1/climbers", json={"name": "Other"}).json()
    headers = {"Authorization": f"Bearer {other['token']}"}
    assert client.get("/v1/me/climbs", headers=headers).json() == []
    assert client.delete(f"/v1/me/climbs/{climb['id']}", headers=headers).status_code == 404
    assert client.get(f"/v1/me/photos/{photo['id']}", headers=headers).status_code == 404
    assert client.delete(f"/v1/me/photos/{photo['id']}", headers=headers).status_code == 404
    assert client.post(f"/v1/me/quests/{quest['id']}/complete", headers=headers).status_code == 404
    assert client.post(f"/v1/me/quests/{quest['id']}/skip", headers=headers).status_code == 404
    assert client.get("/v1/me/pet", headers=headers).json()["xp"] == 0
    assert len(client.get("/v1/me/climbs", headers=auth).json()) == 1


def test_photos_require_both_upload_and_retention_consent(client, auth, image_bytes):
    for consent in ({}, {"upload_consent": "true"}, {"retain_consent": "true"}):
        response = client.post(
            "/v1/me/photos",
            headers=auth,
            data={**consent, "side": "right", "view": "palm"},
            files={"file": ("hand.png", image_bytes, "image/png")},
        )
        assert response.status_code == 403
    assert client.get("/v1/me/photos", headers=auth).json() == []


def test_invalid_or_oversize_images_fail_before_inference(client, auth):
    invalid = client.post(
        "/v1/pose/image",
        headers=auth,
        data={"upload_consent": "true"},
        files={"file": ("bad.jpg", b"not an image", "image/jpeg")},
    )
    assert invalid.status_code == 400
    oversize = client.post(
        "/v1/pose/image",
        headers=auth,
        data={"upload_consent": "true"},
        files={"file": ("big.jpg", b"x" * (8 * 1024 * 1024 + 1), "image/jpeg")},
    )
    assert oversize.status_code == 413


def test_unconfigured_pose_runtime_returns_unavailable(client, auth, image_bytes, monkeypatch):
    monkeypatch.delenv("POSE_MODEL_PATH", raising=False)
    response = client.post(
        "/v1/pose/image",
        headers=auth,
        data={"upload_consent": "true"},
        files={"file": ("pose.png", image_bytes, "image/png")},
    )
    assert response.status_code == 503


def test_rejected_capture_has_no_invented_measurement(client, auth):
    response = client.post("/v1/pose/landmarks", headers=auth, json={"landmarks": []})
    assert response.status_code == 200
    assert response.json()["status"] == "invalid_capture"
    assert response.json()["value"] is None


def test_pose_dimensions_must_be_supplied_together(client, auth):
    assert (
        client.post(
            "/v1/pose/landmarks", headers=auth, json={"landmarks": [], "image_width": 100}
        ).status_code
        == 422
    )


def test_unknown_quest_and_photo_do_not_disclose_other_data(client, auth):
    assert client.get("/v1/me/photos/missing", headers=auth).status_code == 404
    assert client.delete("/v1/me/photos/missing", headers=auth).status_code == 404
    assert client.post("/v1/me/quests/missing/complete", headers=auth).status_code == 404
    assert client.post("/v1/me/quests/missing/skip", headers=auth).status_code == 404


def test_web_client_preflight_allows_only_configured_origin(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    from climbing_monkey.main import create_app

    monkeypatch.setenv("MONKEY_CORS_ORIGINS", "http://localhost:5173")
    with TestClient(create_app(database_path=tmp_path / "cors.sqlite3")) as client:
        response = client.options(
            "/v1/me/profile",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization",
            },
        )
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
        rejected = client.options(
            "/v1/me/profile",
            headers={"Origin": "https://unknown.example", "Access-Control-Request-Method": "GET"},
        )
        assert rejected.status_code == 400
        assert "access-control-allow-origin" not in rejected.headers
