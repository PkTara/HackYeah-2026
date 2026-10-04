"""Live mobility and instrument force contracts; inference stays injected."""

import pytest

from climbing_monkey import pose


def front_pose():
    points = [{"x": 0.5, "y": 0.5, "visibility": 0.9} for _ in range(33)]
    for hip, shoulder, elbow, wrist, x in ((23, 11, 13, 15, 0.4), (24, 12, 14, 16, 0.6)):
        for index, y in ((hip, 0.8), (shoulder, 0.5), (elbow, 0.3), (wrist, 0.1)):
            points[index].update(x=x, y=y)
    return points


def test_overhead_shoulder_angles_and_mean():
    result = pose.analyze_shoulder_landmarks(front_pose())
    assert result["status"] == "ok"
    assert result["metric"] == "shoulder_reach"
    assert result["left_value"] == pytest.approx(180)
    assert result["right_value"] == pytest.approx(180)
    assert result["value"] == pytest.approx(180)
    assert result["protocol"] == "front-facing-overhead-reach-v1"


def test_shoulder_requires_visible_wrists_and_returns_null_pair():
    points = front_pose()
    points[16]["visibility"] = 0.69
    result = pose.analyze_shoulder_landmarks(points)
    assert result["status"] == "invalid_capture"
    assert result["metric"] == "shoulder_reach"
    assert result["value"] is result["left_value"] is result["right_value"] is None
    assert result["confidence"] == 0.69


def test_bent_elbow_cannot_produce_a_shoulder_measurement():
    points = front_pose()
    points[15].update(x=0.6, y=0.3)
    result = pose.analyze_shoulder_landmarks(points)
    assert result["status"] == "invalid_capture"
    assert result["value"] is result["left_value"] is result["right_value"] is None
    assert "straight" in result["reason"]


def test_degenerate_shoulder_vectors_return_invalid_capture():
    points = front_pose()
    points[23] = dict(points[11])
    result = pose.analyze_shoulder_landmarks(points)
    assert result["status"] == "invalid_capture"
    assert result["value"] is result["left_value"] is result["right_value"] is None


def test_shoulder_projection_corrects_aspect_and_averages_different_sides():
    points = front_pose()
    points[13].update(x=0.2, y=0.3)
    points[15].update(x=0, y=0.1)
    result = pose.analyze_shoulder_landmarks(points, image_size=(200, 100))
    assert result["left_value"] == pytest.approx(116.56505117707799)
    assert result["right_value"] == pytest.approx(180)
    assert result["value"] == pytest.approx((116.56505117707799 + 180) / 2)


def test_selected_shoulder_stream_returns_landmarks_dimensions_and_timestamp(tmp_path):
    from io import BytesIO
    from types import SimpleNamespace

    from fastapi.testclient import TestClient
    from PIL import Image
    from test_video import Detector, analyzer_fixture

    from climbing_monkey.main import create_app

    class ShoulderDetector(Detector):
        def detect_for_video(self, image, timestamp_ms):
            self.timestamps.append(timestamp_ms)
            return SimpleNamespace(
                pose_landmarks=[[SimpleNamespace(**point) for point in front_pose()]]
            )

    analyzer, detector = analyzer_fixture(tmp_path, ShoulderDetector())
    with TestClient(
        create_app(database_path=tmp_path / "live.sqlite3", video_analyzer=analyzer)
    ) as client:
        token = client.post("/v1/climbers", json={"name": "Monkey"}).json()["token"]
        jpeg = BytesIO()
        Image.new("RGB", (64, 48)).save(jpeg, format="JPEG")
        with client.websocket_connect("/v1/pose/stream") as socket:
            socket.send_json(
                {
                    "type": "start",
                    "token": token,
                    "upload_consent": True,
                    "metric": "shoulder_reach",
                }
            )
            assert socket.receive_json()["type"] == "ready"
            socket.send_json({"type": "frame", "timestamp_ms": 1234})
            socket.send_bytes(jpeg.getvalue())
            result = socket.receive_json()
            assert result["metric"] == "shoulder_reach"
            assert result["left_value"] == result["right_value"] == pytest.approx(180)
            assert result["landmarks"] == front_pose()
            assert (result["image_width"], result["image_height"]) == (64, 48)
            assert result["timestamp_ms"] == 1234
            socket.send_json({"type": "stop"})
    assert detector.closed


def test_stream_rejects_unknown_selector_before_opening_detector(tmp_path):
    from test_video_api import video_client

    client, auth, detector = video_client(tmp_path)
    with client.websocket_connect("/v1/pose/stream") as socket:
        socket.send_json(
            {
                "type": "start",
                "token": auth["Authorization"][7:],
                "upload_consent": True,
                "metric": "finger_force",
            }
        )
        result = socket.receive_json()
        assert result["type"] == "error"
        assert "metric" in result["detail"]
    assert not detector.closed
    assert not detector.timestamps


def finger_record(**changes):
    return {
        "metric": "finger_force",
        "value": 450,
        "unit": "N",
        "method": "manual",
        "protocol": "instrument-finger-force-v1",
        "side": "left",
        "simulated": True,
        "setup": {
            "instrument": "Load cell",
            "grip": "half_crimp",
            "edge_mm": 20,
            "arm_position": "straight",
            "effort_seconds": 7,
        },
        "occurred_at": "2026-10-04T10:00:00Z",
        **changes,
    }


def test_instrument_force_round_trips_setup_side_and_simulation(client, auth):
    record = finger_record()
    response = client.post("/v1/me/assessments", headers=auth, json=record)
    assert response.status_code == 201, response.json()
    saved = response.json()
    assert {key: saved[key] for key in record} == record
    assert client.get("/v1/me/assessments", headers=auth).json() == [saved]


def test_force_requires_instrument_setup(client, auth):
    record = finger_record()
    del record["setup"]
    response = client.post("/v1/me/assessments", headers=auth, json=record)
    assert response.status_code == 422


def test_force_requires_side(client, auth):
    record = finger_record()
    del record["side"]
    assert client.post("/v1/me/assessments", headers=auth, json=record).status_code == 422


def test_force_must_be_positive(client, auth):
    assert (
        client.post("/v1/me/assessments", headers=auth, json=finger_record(value=0)).status_code
        == 422
    )


def test_force_edge_depth_must_be_positive(client, auth):
    record = finger_record()
    record["setup"]["edge_mm"] = 0
    assert client.post("/v1/me/assessments", headers=auth, json=record).status_code == 422


def test_force_effort_duration_must_be_positive(client, auth):
    record = finger_record()
    record["setup"]["effort_seconds"] = 0
    assert client.post("/v1/me/assessments", headers=auth, json=record).status_code == 422


def test_shoulder_camera_side_record_retains_confidence(client, auth):
    record = {
        "metric": "shoulder_reach_left",
        "value": 172,
        "unit": "degrees",
        "method": "camera",
        "protocol": "front-facing-overhead-reach-v1",
        "side": "left",
        "confidence": 0.84,
        "model_version": "pose-task-v1",
    }
    response = client.post("/v1/me/assessments", headers=auth, json=record)
    assert response.status_code == 201, response.json()
    assert {key: response.json()[key] for key in record} == record
    assert response.json()["simulated"] is False


def test_shoulder_angle_cannot_exceed_180_degrees(client, auth):
    record = {
        "metric": "shoulder_reach_right",
        "value": 181,
        "unit": "degrees",
        "method": "manual",
        "protocol": "front-facing-overhead-reach-v1",
        "side": "right",
    }
    assert client.post("/v1/me/assessments", headers=auth, json=record).status_code == 422


def test_shoulder_side_cannot_disagree_with_metric(client, auth):
    record = {
        "metric": "shoulder_reach_left",
        "value": 172,
        "unit": "degrees",
        "method": "manual",
        "protocol": "front-facing-overhead-reach-v1",
        "side": "right",
    }
    assert client.post("/v1/me/assessments", headers=auth, json=record).status_code == 422


def test_force_trends_skip_other_hand():
    from climbing_monkey.profile import build_profile

    records = [
        {
            "id": "matching",
            **finger_record(value=400, simulated=False, occurred_at="2026-10-01T10:00:00Z"),
        },
        {
            "id": "other",
            **finger_record(
                side="right", value=500, simulated=False, occurred_at="2026-10-02T10:00:00Z"
            ),
        },
        {"id": "latest", **finger_record(simulated=False, occurred_at="2026-10-03T10:00:00Z")},
    ]
    trend = build_profile([], records, [], [])["assessment_trends"]["finger_force"]
    assert trend["previous"]["id"] == "matching"
    assert trend["delta"] == 50


def test_force_trends_skip_changed_setup():
    from climbing_monkey.profile import build_profile

    records = [
        {"id": "matching", **finger_record(value=400, occurred_at="2026-10-01T10:00:00Z")},
        {"id": "other", **finger_record(value=500, occurred_at="2026-10-02T10:00:00Z")},
        {"id": "latest", **finger_record(occurred_at="2026-10-03T10:00:00Z")},
    ]
    records[1]["setup"]["edge_mm"] = 25
    trend = build_profile([], records, [], [])["assessment_trends"]["finger_force"]
    assert trend["previous"]["id"] == "matching"
    assert trend["delta"] == 50


def test_trends_never_compare_simulation_to_real_records():
    from climbing_monkey.profile import build_profile

    records = [
        {
            "id": "matching",
            **finger_record(value=400, simulated=False, occurred_at="2026-10-01T10:00:00Z"),
        },
        {"id": "other", **finger_record(value=500, occurred_at="2026-10-02T10:00:00Z")},
        {"id": "latest", **finger_record(simulated=False, occurred_at="2026-10-03T10:00:00Z")},
    ]
    del records[0]["simulated"]  # Legacy records are real by default.
    trend = build_profile([], records, [], [])["assessment_trends"]["finger_force"]
    assert trend["previous"]["id"] == "matching"
    assert trend["delta"] == 50


def test_invalid_live_pose_clears_unusable_overlay_points():
    import math
    from types import SimpleNamespace

    from climbing_monkey.video import _result

    points = front_pose()
    points[15]["x"] = math.nan
    result = _result(
        SimpleNamespace(pose_landmarks=[[SimpleNamespace(**point) for point in points]]),
        (64, 48),
        "shoulder_reach",
    )
    assert result["status"] == "invalid_capture"
    assert result["landmarks"] == []
    assert result["left_value"] is result["right_value"] is result["value"] is None


def test_invalid_shoulder_measurement_keeps_finite_detected_body_for_live_feedback():
    from types import SimpleNamespace

    from climbing_monkey.video import _result

    points = front_pose()
    points[15].update(x=0.6, y=0.3)
    result = _result(
        SimpleNamespace(pose_landmarks=[[SimpleNamespace(**point) for point in points]]),
        (64, 48),
        "shoulder_reach",
    )
    assert result["status"] == "invalid_capture"
    assert result["left_value"] is result["right_value"] is result["value"] is None
    assert "straight" in result["reason"]
    assert result["landmarks"] == points
    assert (result["image_width"], result["image_height"]) == (64, 48)


@pytest.mark.parametrize(
    "changes",
    [
        {"unit": "kg"},
        {"value": -1},
        {"side": "unknown"},
        {"method": "camera", "confidence": 0.9},
        {"setup": None},
        {"simulated": None},
    ],
)
def test_existing_force_validation_rejects_invalid_records(client, auth, changes):
    assert (
        client.post("/v1/me/assessments", headers=auth, json=finger_record(**changes)).status_code
        == 422
    )


@pytest.mark.parametrize(
    "changes",
    [
        {"instrument": " "},
        {"grip": "unknown"},
        {"arm_position": "unknown"},
        {"edge_mm": -1},
        {"effort_seconds": -1},
        {"unexpected": "field"},
    ],
)
def test_existing_setup_validation_rejects_invalid_conditions(client, auth, changes):
    record = finger_record()
    record["setup"].update(changes)
    assert client.post("/v1/me/assessments", headers=auth, json=record).status_code == 422


def test_kilogram_force_is_kept_as_its_original_unit(client, auth):
    response = client.post(
        "/v1/me/assessments", headers=auth, json=finger_record(value=42, unit="kgf")
    )
    assert response.status_code == 201
    assert response.json()["unit"] == "kgf"
    assert response.json()["value"] == 42


@pytest.mark.parametrize("confidence", [None, 0.69])
def test_existing_camera_confidence_rule_applies_to_shoulder(client, auth, confidence):
    record = {
        "metric": "shoulder_reach_right",
        "value": 172,
        "unit": "degrees",
        "method": "camera",
        "protocol": "front-facing-overhead-reach-v1",
    }
    if confidence is not None:
        record["confidence"] = confidence
    assert client.post("/v1/me/assessments", headers=auth, json=record).status_code == 422


def test_no_detected_pose_returns_selected_metric_and_empty_overlay():
    from types import SimpleNamespace

    from climbing_monkey.video import _result

    result = _result(SimpleNamespace(pose_landmarks=[]), (64, 48), "shoulder_reach")
    assert result["status"] == "invalid_capture"
    assert result["metric"] == "shoulder_reach"
    assert result["landmarks"] == []
    assert result["value"] is result["left_value"] is result["right_value"] is None
    assert (result["image_width"], result["image_height"]) == (64, 48)


def test_default_video_result_keeps_leg_spread_and_adds_overlay():
    from types import SimpleNamespace

    from test_pose import visible_pose

    from climbing_monkey.video import _result

    result = _result(
        SimpleNamespace(pose_landmarks=[[SimpleNamespace(**point) for point in visible_pose()]]),
        (100, 100),
    )
    assert result["metric"] == "leg_spread"
    assert result["value"] == 90
    assert result["landmarks"] == visible_pose()
    assert (result["image_width"], result["image_height"]) == (100, 100)


def test_unused_nonfinite_landmark_cannot_break_live_result_json():
    import json
    import math
    from types import SimpleNamespace

    from climbing_monkey.video import _result

    points = front_pose()
    points[0]["x"] = math.nan
    result = _result(
        SimpleNamespace(pose_landmarks=[[SimpleNamespace(**point) for point in points]]),
        (64, 48),
        "shoulder_reach",
    )
    assert result["status"] == "ok"  # Required measurement points remain visible.
    assert result["landmarks"] == []
    assert json.loads(json.dumps(result, allow_nan=False))["value"] == pytest.approx(180)


def test_instrument_force_can_record_both_hands(client, auth):
    record = finger_record(side="both")
    response = client.post("/v1/me/assessments", headers=auth, json=record)
    assert response.status_code == 201, response.json()
    assert response.json()["side"] == "both"
    assert client.get("/v1/me/assessments", headers=auth).json()[0]["side"] == "both"


def test_shoulder_decision_snapshots_actual_joint_inputs_and_geometry():
    import json
    import math

    points = front_pose()
    points[13].update(x=0.2, y=0.3)
    points[15].update(x=0, y=0.1)
    result = pose.analyze_shoulder_landmarks(points, image_size=(200, 100))
    decision = result["decision"]
    indices = (11, 12, 13, 14, 15, 16, 23, 24)
    assert [entry["id"] for entry in decision["evidence"][:8]] == [
        f"landmark-{index}" for index in indices
    ]
    captured = {
        index: json.loads(entry["detail"])
        for index, entry in zip(indices, decision["evidence"][:8], strict=True)
    }
    assert captured == {index: points[index] for index in indices}
    geometry = json.loads(decision["evidence"][8]["detail"])
    assert geometry == {
        "width": 200,
        "height": 100,
        "aspect_ratio": 2,
        "square_assumption": False,
        "visibility_threshold": 0.7,
        "minimum_elbow_angle": 160,
    }

    def angle(a, vertex, b):
        left = ((a["x"] - vertex["x"]) * geometry["aspect_ratio"], a["y"] - vertex["y"])
        right = ((b["x"] - vertex["x"]) * geometry["aspect_ratio"], b["y"] - vertex["y"])
        return math.degrees(
            math.acos(
                sum(a * b for a, b in zip(left, right)) / (math.hypot(*left) * math.hypot(*right))
            )
        )

    assert result["left_value"] == pytest.approx(angle(captured[23], captured[11], captured[13]))
    assert result["right_value"] == pytest.approx(angle(captured[24], captured[12], captured[14]))
    assert result["value"] == pytest.approx((result["left_value"] + result["right_value"]) / 2)
    assert "shoulder" in decision["summary"]
    assert "hip midpoint" not in decision["rule"]
    assert "160" in decision["rule"]
    assert decision["source_ids"] == ["stenum2021", "barzegar2024"]
    assert "model/version unavailable" in " ".join(decision["limitations"])
    assert "decision" not in pose.analyze_shoulder_landmarks([])


def test_confirmed_camera_snapshot_round_trips_with_explicit_report_limitation(client, auth):
    import json

    result = pose.analyze_shoulder_landmarks(front_pose(), image_size=(64, 48))
    payload = {
        "metric": "shoulder_reach_left",
        "value": result["left_value"],
        "unit": "degrees",
        "method": "camera",
        "protocol": result["protocol"],
        "confidence": result["confidence"],
        "occurred_at": "2026-10-04T10:00:00Z",
        "decision": result["decision"],
    }
    response = client.post("/v1/me/assessments", headers=auth, json=payload)
    assert response.status_code == 201, response.json()
    saved = response.json()
    assert saved["model_version"] is None
    assert saved["decision"]["evidence"] == result["decision"]["evidence"]
    assert saved["decision"]["source_ids"] == result["decision"]["source_ids"]
    assert "client-supplied" in " ".join(saved["decision"]["limitations"])
    assert client.get("/v1/me/assessments", headers=auth).json() == [saved]
    assert client.delete(f"/v1/me/assessments/{saved['id']}", headers=auth).status_code == 204
    assert client.get("/v1/me/assessments", headers=auth).json() == []
    assert "landmark-11" not in json.dumps(client.get("/v1/me/export", headers=auth).json())


@pytest.mark.parametrize(
    "changes",
    [
        {"status": "verified"},
        {"rule": "x" * 6001},
        {"evidence": [{}]},
        {"evidence": [{"id": "point", "label": "Point", "detail": "x" * 4001}]},
        {"source_ids": ["x"] * 33},
        {"limitations": ["x"] * 33},
        {"unknown": "field"},
    ],
)
def test_saved_decision_rejects_malformed_or_unbounded_metadata(client, auth, changes):
    snapshot = pose.analyze_shoulder_landmarks(front_pose())["decision"]
    snapshot.update(changes)
    payload = {
        "metric": "shoulder_reach_left",
        "value": 180,
        "unit": "degrees",
        "method": "camera",
        "protocol": "front-facing-overhead-reach-v1",
        "confidence": 0.9,
        "decision": snapshot,
    }
    assert client.post("/v1/me/assessments", headers=auth, json=payload).status_code == 422


def test_deleted_record_is_redacted_from_saved_assessment_snapshot(client, auth):
    hand = client.post(
        "/v1/me/hands",
        headers=auth,
        json={
            "side": "left",
            "region": "ring_finger",
            "pain": 3,
        },
    ).json()
    snapshot = pose.analyze_shoulder_landmarks(front_pose())["decision"]
    snapshot["evidence"].append(
        {
            "id": hand["id"],
            "label": "Reported hand",
            "detail": "pain=3; private-note",
        }
    )
    saved = client.post(
        "/v1/me/assessments",
        headers=auth,
        json={
            "metric": "shoulder_reach_left",
            "value": 180,
            "unit": "degrees",
            "method": "camera",
            "protocol": "front-facing-overhead-reach-v1",
            "confidence": 0.9,
            "decision": snapshot,
        },
    ).json()
    assert "id" in saved, saved
    assert client.delete(f"/v1/me/hands/{hand['id']}", headers=auth).status_code == 204
    history = client.get("/v1/me/assessments", headers=auth).json()
    entry = next(entry for entry in history[0]["decision"]["evidence"] if entry["id"] == hand["id"])
    assert entry == {
        "id": hand["id"],
        "label": "Record removed",
        "detail": "Provenance unavailable after deletion.",
    }
    assert "private-note" not in str(client.get("/v1/me/export", headers=auth).json())
