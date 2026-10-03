def test_identity_can_be_read_with_issued_token(client):
    created = client.post("/v1/climbers", json={"name": "Monkey", "goal": "technique"})
    assert created.status_code == 201
    token = created.json()["token"]
    response = client.get("/v1/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["name"] == "Monkey"
    assert "token" not in response.json()


def test_identity_survives_restart_without_storing_plain_token(tmp_path):
    import sqlite3

    from fastapi.testclient import TestClient

    from climbing_monkey.main import create_app

    path = tmp_path / "monkey.sqlite3"
    with TestClient(create_app(database_path=path)) as first:
        created = first.post("/v1/climbers", json={"name": "Persistent Monkey"}).json()
    with TestClient(create_app(database_path=path)) as second:
        response = second.get("/v1/me", headers={"Authorization": f"Bearer {created['token']}"})
        assert response.status_code == 200
        assert response.json()["id"] == created["id"]
    with sqlite3.connect(path) as db:
        assert created["token"] not in str(db.execute("SELECT * FROM climbers").fetchall())


def test_climb_log_retains_style_and_grading_context(client, auth):
    payload = {
        "terrain": "slab",
        "movement": "controlled",
        "completed": True,
        "attempts": 2,
        "grade": "6A",
        "grade_system": "font",
        "location": "Gym",
    }
    response = client.post("/v1/me/climbs", headers=auth, json=payload)
    assert response.status_code == 201
    saved = response.json()
    assert saved["id"]
    assert saved["terrain"] == "slab"
    assert saved["grade_system"] == "font"
    assert saved["occurred_at"].endswith("Z")
    assert client.get("/v1/me/climbs", headers=auth).json() == [saved]


def test_assessment_retains_protocol_and_provenance(client, auth):
    payload = {
        "metric": "leg_spread",
        "value": 80.0,
        "unit": "degrees",
        "protocol": "front-facing-leg-spread-v1",
        "method": "manual",
    }
    saved = client.post("/v1/me/assessments", headers=auth, json=payload)
    assert saved.status_code == 201
    assert saved.json()["protocol"] == payload["protocol"]
    assert client.get("/v1/me/assessments", headers=auth).json() == [saved.json()]


def test_hand_report_records_location_and_severity(client, auth):
    saved = client.post(
        "/v1/me/hands",
        headers=auth,
        json={"side": "right", "region": "ring_finger", "pain": 4, "note": "After session"},
    )
    assert saved.status_code == 201
    assert saved.json()["pain"] == 4
    assert client.get("/v1/me/hands", headers=auth).json() == [saved.json()]


def test_activity_log_is_manual_context_not_invented_import(client, auth):
    saved = client.post(
        "/v1/me/activities", headers=auth, json={"kind": "bouldering", "duration_minutes": 45}
    )
    assert saved.status_code == 201
    assert saved.json()["source"] == "manual"
    assert client.get("/v1/me/activities", headers=auth).json() == [saved.json()]


def test_user_can_delete_owned_evidence(client, auth):
    saved = client.post(
        "/v1/me/climbs",
        headers=auth,
        json={"terrain": "overhang", "movement": "dynamic", "completed": False, "attempts": 1},
    ).json()
    response = client.delete(f"/v1/me/climbs/{saved['id']}", headers=auth)
    assert response.status_code == 204
    assert client.get("/v1/me/climbs", headers=auth).json() == []
    assert client.delete(f"/v1/me/climbs/{saved['id']}", headers=auth).status_code == 404


def test_assessment_rejects_wrong_unit_for_metric(client, auth):
    response = client.post(
        "/v1/me/assessments",
        headers=auth,
        json={
            "metric": "leg_spread",
            "value": 90,
            "unit": "seconds",
            "protocol": "front-facing",
            "method": "manual",
        },
    )
    assert response.status_code == 422
    assert client.get("/v1/me/assessments", headers=auth).json() == []


def test_low_confidence_camera_result_cannot_be_saved_as_valid(client, auth):
    response = client.post(
        "/v1/me/assessments",
        headers=auth,
        json={
            "metric": "leg_spread",
            "value": 80,
            "unit": "degrees",
            "protocol": "front-facing",
            "method": "camera",
            "confidence": 0.2,
        },
    )
    assert response.status_code == 422


def test_impossible_leg_spread_is_rejected(client, auth):
    response = client.post(
        "/v1/me/assessments",
        headers=auth,
        json={
            "metric": "leg_spread",
            "value": 181,
            "unit": "degrees",
            "protocol": "front-facing",
            "method": "manual",
        },
    )
    assert response.status_code == 422


def test_logs_are_sorted_by_actual_instant_across_timezones(client, auth):
    payload = {"terrain": "slab", "movement": "controlled", "completed": True, "attempts": 1}
    earlier = client.post(
        "/v1/me/climbs", headers=auth, json={**payload, "occurred_at": "2026-10-03T12:00:00+02:00"}
    ).json()
    later = client.post(
        "/v1/me/climbs", headers=auth, json={**payload, "occurred_at": "2026-10-03T11:00:00Z"}
    ).json()
    assert [r["id"] for r in client.get("/v1/me/climbs", headers=auth).json()] == [
        earlier["id"],
        later["id"],
    ]


def test_preferences_can_change_without_reissuing_credentials(client, auth):
    response = client.patch("/v1/me", headers=auth, json={"goal": "mobility", "pet_visible": False})
    assert response.status_code == 200
    assert response.json()["goal"] == "mobility"
    assert response.json()["pet_visible"] is False
    assert client.get("/v1/me", headers=auth).json() == response.json()


def test_profile_shows_observed_styles_and_recalculates_after_deletion(client, auth):
    saved = client.post(
        "/v1/me/climbs",
        headers=auth,
        json={"terrain": "slab", "movement": "controlled", "completed": True, "attempts": 1},
    ).json()
    response = client.get("/v1/me/profile", headers=auth)
    assert response.status_code == 200
    profile = response.json()
    assert profile["terrain"]["slab"]["sample_count"] == 1
    assert profile["terrain"]["slab"]["completion_rate"] == 1.0
    assert profile["terrain"]["slab"]["ability_score"] is None
    assert profile["terrain"]["overhang"]["completion_rate"] is None
    assert all(value is None for value in profile["radar"].values())
    client.delete(f"/v1/me/climbs/{saved['id']}", headers=auth)
    assert client.get("/v1/me/profile", headers=auth).json()["terrain"]["slab"]["sample_count"] == 0


def test_export_contains_only_the_current_climbers_data(client, auth):
    climb = client.post(
        "/v1/me/climbs",
        headers=auth,
        json={"terrain": "slab", "movement": "controlled", "completed": True, "attempts": 1},
    ).json()
    response = client.get("/v1/me/export", headers=auth)
    assert response.status_code == 200
    assert response.json()["records"]["climbs"] == [climb]
    assert "token" not in response.json()["climber"]
    other = client.post("/v1/climbers", json={"name": "Other"}).json()
    second = client.get("/v1/me/export", headers={"Authorization": f"Bearer {other['token']}"})
    assert second.json()["records"]["climbs"] == []


def test_deleting_identity_removes_records_and_revokes_token(client, auth):
    client.post(
        "/v1/me/climbs",
        headers=auth,
        json={"terrain": "slab", "movement": "controlled", "completed": True, "attempts": 1},
    )
    owner = client.get("/v1/me", headers=auth).json()["id"]
    response = client.delete("/v1/me", headers=auth)
    assert response.status_code == 204
    assert client.get("/v1/me", headers=auth).status_code == 401
    with client.app.state.store.connect() as db:
        assert (
            db.execute("SELECT count(*) FROM records WHERE owner = ?", (owner,)).fetchone()[0] == 0
        )


def test_log_order_handles_fractional_seconds(client, auth):
    payload = {"terrain": "slab", "movement": "controlled", "completed": True, "attempts": 1}
    later = client.post(
        "/v1/me/climbs",
        headers=auth,
        json={**payload, "occurred_at": "2026-10-03T10:00:00.100000Z"},
    ).json()
    earlier = client.post(
        "/v1/me/climbs", headers=auth, json={**payload, "occurred_at": "2026-10-03T10:00:00Z"}
    ).json()
    assert [r["id"] for r in client.get("/v1/me/climbs", headers=auth).json()] == [
        earlier["id"],
        later["id"],
    ]


def test_heatmap_distinguishes_unknown_from_reported_zero_and_supports_history(client, auth):
    client.post(
        "/v1/me/hands",
        headers=auth,
        json={
            "side": "left",
            "region": "ring_finger",
            "pain": 5,
            "occurred_at": "2026-10-01T10:00:00Z",
        },
    )
    client.post(
        "/v1/me/hands",
        headers=auth,
        json={
            "side": "left",
            "region": "ring_finger",
            "pain": 0,
            "occurred_at": "2026-10-03T10:00:00Z",
        },
    )
    response = client.get("/v1/me/hands/heatmap", headers=auth)
    assert response.status_code == 200
    assert response.json()["left"]["ring_finger"]["pain"] == 0
    assert response.json()["right"]["ring_finger"]["pain"] is None
    old = client.get("/v1/me/hands/heatmap?at=2026-10-02T10:00:00Z", headers=auth).json()
    assert old["left"]["ring_finger"]["pain"] == 5


def test_camera_cannot_claim_unimplemented_strength_measurement(client, auth):
    response = client.post(
        "/v1/me/assessments",
        headers=auth,
        json={
            "metric": "pullups",
            "value": 10,
            "unit": "repetitions",
            "protocol": "camera-strength",
            "method": "camera",
        },
    )
    assert response.status_code == 422


def test_climbing_history_and_pet_rewards_survive_app_restart(tmp_path):
    from fastapi.testclient import TestClient

    from climbing_monkey.main import create_app

    path = tmp_path / "history.sqlite3"
    with TestClient(create_app(database_path=path)) as first:
        token = first.post("/v1/climbers", json={"name": "Persistent Monkey"}).json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        climb = first.post(
            "/v1/me/climbs",
            headers=headers,
            json={"terrain": "overhang", "movement": "dynamic", "completed": True, "attempts": 2},
        ).json()
        quest = first.post("/v1/me/quests", headers=headers).json()
        first.post(f"/v1/me/quests/{quest['id']}/complete", headers=headers)
    with TestClient(create_app(database_path=path)) as second:
        assert second.get("/v1/me/climbs", headers=headers).json() == [climb]
        assert second.get("/v1/me/pet", headers=headers).json()["xp"] == 10
        assert (
            second.get("/v1/me/profile", headers=headers).json()["terrain"]["overhang"][
                "sample_count"
            ]
            == 1
        )


def test_delete_identity_cascades_quests_and_photos(client, auth, image_bytes):
    owner = client.get("/v1/me", headers=auth).json()["id"]
    quest = client.post("/v1/me/quests", headers=auth).json()
    client.post(f"/v1/me/quests/{quest['id']}/complete", headers=auth)
    client.post(
        "/v1/me/photos",
        headers=auth,
        data={"upload_consent": "true", "retain_consent": "true", "side": "right", "view": "palm"},
        files={"file": ("hand.png", image_bytes, "image/png")},
    )
    assert client.delete("/v1/me", headers=auth).status_code == 204
    with client.app.state.store.connect() as db:
        for table in ("records", "quests", "photos"):
            assert (
                db.execute(f"SELECT count(*) FROM {table} WHERE owner = ?", (owner,)).fetchone()[0]
                == 0
            )


def test_camera_assessment_requires_explicit_confidence(client, auth):
    response = client.post(
        "/v1/me/assessments",
        headers=auth,
        json={
            "metric": "leg_spread",
            "value": 90,
            "unit": "degrees",
            "method": "camera",
            "protocol": "front-facing-leg-spread-v1",
        },
    )
    assert response.status_code == 422


def test_nonfinite_json_numeric_input_returns_validation_error_not_server_error(client, auth):
    from fastapi.testclient import TestClient

    with TestClient(client.app, raise_server_exceptions=False) as transport:
        response = transport.post(
            "/v1/me/assessments",
            headers={**auth, "Content-Type": "application/json"},
            content='{"metric":"leg_spread","value":1e400,"unit":"degrees",'
            '"method":"manual","protocol":"test"}',
        )
        assert response.status_code == 422
        assert response.json()["detail"][0]["type"] == "finite_number"


def test_database_location_can_be_configured_for_running_server(tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    from climbing_monkey.main import create_app

    path = tmp_path / "configured" / "monkey.sqlite3"
    monkeypatch.setenv("MONKEY_DATABASE_PATH", str(path))
    with TestClient(create_app()) as client:
        response = client.post("/v1/climbers", json={"name": "Configured Monkey"})
        assert response.status_code == 201
    assert path.exists()


def test_body_length_measurement_must_be_positive(client, auth):
    response = client.post(
        "/v1/me/assessments",
        headers=auth,
        json={
            "metric": "height",
            "value": 0,
            "unit": "cm",
            "method": "manual",
            "protocol": "tape-measure",
        },
    )
    assert response.status_code == 422


def test_pullup_count_cannot_be_fractional(client, auth):
    response = client.post(
        "/v1/me/assessments",
        headers=auth,
        json={
            "metric": "pullups",
            "value": 2.5,
            "unit": "repetitions",
            "method": "manual",
            "protocol": "counted-pullups",
        },
    )
    assert response.status_code == 422
