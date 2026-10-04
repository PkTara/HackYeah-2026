def test_explicit_assignment_returns_one_evidence_gathering_quest(client, auth):
    response = client.post("/v1/me/quests", headers=auth)
    assert response.status_code == 201
    quest = response.json()
    assert quest["kind"] == "record_assessment"
    assert quest["status"] == "assigned"
    assert quest["reason"]
    assert client.post("/v1/me/quests", headers=auth).json()["id"] == quest["id"]
    assert client.get("/v1/me/quests", headers=auth).json() == [quest]


def test_completion_awards_xp_once_and_keeps_ability_unknown(client, auth):
    quest = client.post("/v1/me/quests", headers=auth).json()
    first = client.post(f"/v1/me/quests/{quest['id']}/complete", headers=auth)
    assert first.status_code == 200
    assert first.json()["quest"]["status"] == "completed"
    assert first.json()["pet"]["xp"] == 10
    again = client.post(f"/v1/me/quests/{quest['id']}/complete", headers=auth)
    assert again.json() == first.json()
    assert client.get("/v1/me/pet", headers=auth).json()["xp"] == 10
    profile = client.get("/v1/me/profile", headers=auth).json()
    assert profile["terrain"]["slab"]["ability_score"] is None
    assert profile["terrain"]["slab"]["sample_count"] == 0


def test_supported_style_focus_produces_an_explained_reflection(client, auth):
    ids = []
    for _ in range(3):
        response = client.post(
            "/v1/me/climbs",
            headers=auth,
            json={"terrain": "vertical", "movement": "dynamic", "completed": False, "attempts": 1},
        )
        ids.append(response.json()["id"])
    quest = client.post("/v1/me/quests", headers=auth).json()
    assert quest["kind"] == "reflect_climb"
    assert set(quest["evidence_ids"]) == set(ids)
    assert "vertical" in quest["reason"]


def test_current_hand_discomfort_prioritizes_a_checkin(client, auth):
    hand = client.post(
        "/v1/me/hands", headers=auth, json={"side": "left", "region": "ring_finger", "pain": 3}
    ).json()
    quest = client.post("/v1/me/quests", headers=auth).json()
    assert quest["kind"] == "recovery_checkin"
    assert quest["evidence_ids"] == [hand["id"]]
    assert "loading" not in quest.get("instructions", "")


def test_new_symptom_pauses_outdated_quest_and_assigns_safe_alternative(client, auth):
    original = client.post("/v1/me/quests", headers=auth).json()
    client.post(
        "/v1/me/hands", headers=auth, json={"side": "left", "region": "ring_finger", "pain": 3}
    )
    history = client.get("/v1/me/quests", headers=auth).json()
    assert history[0]["status"] == "paused"
    blocked = client.post(f"/v1/me/quests/{original['id']}/complete", headers=auth)
    assert blocked.status_code == 409
    assert client.get("/v1/me/pet", headers=auth).json()["xp"] == 0
    alternative = client.post("/v1/me/quests", headers=auth).json()
    assert alternative["id"] != original["id"]
    assert alternative["kind"] == "recovery_checkin"
    assert (
        client.post(f"/v1/me/quests/{alternative['id']}/complete", headers=auth).status_code == 200
    )


def test_skip_never_removes_xp_and_cannot_later_be_completed(client, auth):
    first = client.post("/v1/me/quests", headers=auth).json()
    client.post(f"/v1/me/quests/{first['id']}/complete", headers=auth)
    second = client.post("/v1/me/quests", headers=auth).json()
    skipped = client.post(f"/v1/me/quests/{second['id']}/skip", headers=auth)
    assert skipped.status_code == 200
    assert skipped.json()["status"] == "skipped"
    assert client.get("/v1/me/pet", headers=auth).json()["xp"] == 10
    assert client.post(f"/v1/me/quests/{second['id']}/complete", headers=auth).status_code == 409


def test_user_selected_mobility_goal_controls_the_next_action(client, auth):
    for _ in range(3):
        client.post(
            "/v1/me/climbs",
            headers=auth,
            json={
                "terrain": "vertical",
                "movement": "controlled",
                "completed": False,
                "attempts": 1,
            },
        )
    client.patch("/v1/me", headers=auth, json={"goal": "mobility"})
    quest = client.post("/v1/me/quests", headers=auth).json()
    assert quest["kind"] == "record_assessment"
    assert "mobility" in quest["reason"]


def test_quest_instructions_explain_completion_and_target_skill(client, auth):
    quest = client.post("/v1/me/quests", headers=auth).json()
    assert quest["definition_version"] == "1"
    assert quest["title"]
    assert quest["instructions"]
    assert quest["completion_method"] == "self_reported"
    assert quest["target_skill"] == "assessment"


def test_five_unique_completions_level_up_without_scoring_ability(client, auth):
    ids = set()
    for _ in range(5):
        quest = client.post("/v1/me/quests", headers=auth).json()
        ids.add(quest["id"])
        assert client.post(f"/v1/me/quests/{quest['id']}/complete", headers=auth).status_code == 200
    assert len(ids) == 5
    assert client.get("/v1/me/pet", headers=auth).json() == {
        "xp": 50,
        "level": 2,
        "cosmetic": "canopy",
    }
    assert client.get("/v1/me/profile", headers=auth).json()["terrain"]["slab"]["sample_count"] == 0


def test_simultaneous_completion_retries_do_not_duplicate_xp(client, auth):
    from concurrent.futures import ThreadPoolExecutor

    quest = client.post("/v1/me/quests", headers=auth).json()
    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(
            executor.map(
                lambda _: client.post(f"/v1/me/quests/{quest['id']}/complete", headers=auth),
                range(8),
            )
        )
    assert all(response.status_code == 200 for response in results)
    assert client.get("/v1/me/pet", headers=auth).json()["xp"] == 10


def test_deleted_focus_evidence_cannot_complete_old_quest(client, auth):
    ids = []
    for _ in range(3):
        ids.append(
            client.post(
                "/v1/me/climbs",
                headers=auth,
                json={
                    "terrain": "vertical",
                    "movement": "dynamic",
                    "completed": False,
                    "attempts": 1,
                },
            ).json()["id"]
        )
    quest = client.post("/v1/me/quests", headers=auth).json()
    client.delete(f"/v1/me/climbs/{ids[0]}", headers=auth)
    assert client.post(f"/v1/me/quests/{quest['id']}/complete", headers=auth).status_code == 409
    assert client.get("/v1/me/pet", headers=auth).json()["xp"] == 0


def test_completed_quest_cannot_be_skipped_or_lose_reward(client, auth):
    quest = client.post("/v1/me/quests", headers=auth).json()
    client.post(f"/v1/me/quests/{quest['id']}/complete", headers=auth)
    assert client.post(f"/v1/me/quests/{quest['id']}/skip", headers=auth).status_code == 409
    assert client.get("/v1/me/pet", headers=auth).json()["xp"] == 10


def test_completion_rechecks_goal_changed_before_transaction(client, auth, monkeypatch):
    import json

    for _ in range(3):
        client.post(
            "/v1/me/climbs",
            headers=auth,
            json={"terrain": "vertical", "movement": "dynamic", "completed": False, "attempts": 1},
        )
    quest = client.post("/v1/me/quests", headers=auth).json()
    store = client.app.state.store
    original = store.complete_quest

    def update_before_transaction(owner, quest_id, eligible):
        with store.connect() as db:
            row = db.execute("SELECT data FROM climbers WHERE id = ?", (owner,)).fetchone()
        user = json.loads(row["data"])
        store.update_climber({**user, "goal": "mobility"})
        return original(owner, quest_id, eligible)

    monkeypatch.setattr(store, "complete_quest", update_before_transaction)
    response = client.post(f"/v1/me/quests/{quest['id']}/complete", headers=auth)
    assert response.status_code == 409
    assert client.get("/v1/me/pet", headers=auth).json()["xp"] == 0


def test_assignment_uses_evidence_committed_before_transaction(client, auth, monkeypatch):
    store = client.app.state.store
    original = store.assign_quest

    def add_symptom_before_transaction(owner, candidate, eligible):
        store.add_record(
            owner,
            "hands",
            {
                "id": "race-hand",
                "side": "left",
                "region": "ring_finger",
                "pain": 3,
                "note": "",
                "photo_id": None,
                "occurred_at": "2026-10-03T10:00:00Z",
            },
        )
        return original(owner, candidate, eligible)

    monkeypatch.setattr(store, "assign_quest", add_symptom_before_transaction)
    response = client.post("/v1/me/quests", headers=auth)
    assert response.status_code == 201
    assert response.json()["kind"] == "recovery_checkin"
    assert response.json()["evidence_ids"] == ["race-hand"]
    assert client.get("/v1/me/quests", headers=auth).json()[0]["status"] == "assigned"


def test_reflection_decision_snapshots_dated_climbs_and_product_threshold(client, auth):
    records = []
    for day, completed in ((1, False), (2, True), (3, False)):
        records.append(
            client.post(
                "/v1/me/climbs",
                headers=auth,
                json={
                    "terrain": "vertical",
                    "movement": "dynamic",
                    "completed": completed,
                    "grade": "V3",
                    "occurred_at": f"2026-10-0{day}T10:00:00Z",
                },
            ).json()
        )
    quest = client.post("/v1/me/quests", headers=auth).json()
    decision = quest["decision"]
    assert decision["status"] == "app_rule"
    assert ">=3" in decision["rule"]
    assert "product" in " ".join(decision["limitations"]).lower()
    climbs = [entry for entry in decision["evidence"] if entry["label"].startswith("Climb ·")]
    assert [entry["id"] for entry in climbs] == quest["evidence_ids"]
    for record, entry in zip(records, climbs, strict=True):
        assert record["occurred_at"] in entry["label"]
        assert "vertical" in entry["detail"]
        assert f"completed={str(record['completed']).lower()}" in entry["detail"]
        assert "V3" in entry["detail"]


def test_discomfort_decision_keeps_latest_dated_pain_report(client, auth):
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
    hand = client.post(
        "/v1/me/hands",
        headers=auth,
        json={
            "side": "left",
            "region": "ring_finger",
            "pain": None,
            "occurred_at": "2026-10-03T10:00:00Z",
        },
    ).json()
    decision = client.post("/v1/me/quests", headers=auth).json()["decision"]
    assert [entry["id"] for entry in decision["evidence"]] == [hand["id"]]
    assert hand["occurred_at"] in decision["evidence"][0]["label"]
    assert "left" in decision["evidence"][0]["detail"]
    assert "ring_finger" in decision["evidence"][0]["detail"]
    assert "pain=unrated" in decision["evidence"][0]["detail"]
    assert "pain null or >0" in decision["rule"]
    assert "diagnosis" in " ".join(decision["limitations"])


def test_mobility_decision_preserves_goal_input_instead_of_inventing_measurements(client, auth):
    client.patch("/v1/me", headers=auth, json={"goal": "mobility"})
    decision = client.post("/v1/me/quests", headers=auth).json()["decision"]
    assert any(entry["detail"] == "goal=mobility" for entry in decision["evidence"])
    assert "mobility" in decision["rule"]
    assert "no active" in decision["rule"]
    assert "2-minute" in " ".join(decision["limitations"])
    assert not any("measurement" in entry["label"].lower() for entry in decision["evidence"])


def test_reflection_snapshot_includes_comparator_records_and_assignment_gates(client, auth):
    records = []
    for terrain in ("slab", "vertical"):
        for _ in range(3):
            records.append(
                client.post(
                    "/v1/me/climbs",
                    headers=auth,
                    json={
                        "terrain": terrain,
                        "movement": "controlled",
                        "completed": terrain == "slab",
                    },
                ).json()
            )
    decision = client.post("/v1/me/quests", headers=auth).json()["decision"]
    assert {record["id"] for record in records} <= {entry["id"] for entry in decision["evidence"]}
    assert "no active" in decision["rule"]
    assert "mobility" in decision["rule"]
    assert "assignment" in " ".join(decision["limitations"])


def test_gathering_decision_keeps_existing_logs_goal_and_counts(client, auth):
    client.patch("/v1/me", headers=auth, json={"goal": "general"})
    record = client.post(
        "/v1/me/climbs",
        headers=auth,
        json={
            "terrain": "slab",
            "movement": "dynamic",
            "completed": False,
            "occurred_at": "2026-10-02T10:00:00Z",
        },
    ).json()
    decision = client.post("/v1/me/quests", headers=auth).json()["decision"]
    assert record["id"] in [entry["id"] for entry in decision["evidence"]]
    assert any(entry["detail"] == "goal=general" for entry in decision["evidence"])
    assert "slab: 0/1" in decision["rule"]
    assert "no active" in decision["rule"]


def test_deleting_record_redacts_snapshot_from_completed_quests(client, auth):
    hand = client.post(
        "/v1/me/hands",
        headers=auth,
        json={
            "side": "left",
            "region": "ring_finger",
            "pain": 7,
            "occurred_at": "2026-10-03T10:00:00Z",
        },
    ).json()
    quest = client.post("/v1/me/quests", headers=auth).json()
    client.post(f"/v1/me/quests/{quest['id']}/complete", headers=auth)
    assert client.delete(f"/v1/me/hands/{hand['id']}", headers=auth).status_code == 204
    saved = client.get("/v1/me/quests", headers=auth).json()[0]
    entry = next(entry for entry in saved["decision"]["evidence"] if entry["id"] == hand["id"])
    assert entry == {
        "id": hand["id"],
        "label": "Record removed",
        "detail": "Provenance unavailable after deletion.",
    }
    assert client.get("/v1/me/pet", headers=auth).json()["xp"] == 10


def test_reflection_snapshots_exact_goal_and_cleared_hand_gate(client, auth):
    hand = client.post(
        "/v1/me/hands",
        headers=auth,
        json={
            "side": "right",
            "region": "index_finger",
            "pain": 0,
            "occurred_at": "2026-10-03T10:00:00Z",
        },
    ).json()
    for _ in range(3):
        client.post(
            "/v1/me/climbs",
            headers=auth,
            json={
                "terrain": "vertical",
                "movement": "controlled",
                "completed": False,
            },
        )
    decision = client.post("/v1/me/quests", headers=auth).json()["decision"]
    assert any(entry["detail"] == "goal=technique" for entry in decision["evidence"])
    assert any(
        entry["id"] == hand["id"] and "pain=0" in entry["detail"] for entry in decision["evidence"]
    )


def test_mobility_decision_keeps_cleared_hand_report_used_by_eligibility(client, auth):
    hand = client.post(
        "/v1/me/hands",
        headers=auth,
        json={
            "side": "left",
            "region": "middle_finger",
            "pain": 0,
            "occurred_at": "2026-10-03T10:00:00Z",
        },
    ).json()
    client.patch("/v1/me", headers=auth, json={"goal": "mobility"})
    decision = client.post("/v1/me/quests", headers=auth).json()["decision"]
    assert any(
        entry["id"] == hand["id"] and "pain=0" in entry["detail"] for entry in decision["evidence"]
    )
