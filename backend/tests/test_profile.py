from copy import deepcopy

from climbing_monkey.profile import build_profile


def climb(record_id, terrain="slab", movement="controlled", completed=False):
    return {
        "id": record_id,
        "terrain": terrain,
        "movement": movement,
        "completed": completed,
        "attempts": 10,
        "grade": "6A",
        "grade_system": "font",
        "location": "Gym",
        "occurred_at": "2026-10-03T10:00:00+02:00",
    }


def assessment(record_id, value, occurred_at, **changes):
    return {
        "id": record_id,
        "metric": "leg_spread",
        "value": value,
        "unit": "degrees",
        "method": "manual",
        "protocol": "seated-v1",
        "confidence": 0.9,
        "occurred_at": occurred_at,
        **changes,
    }


def hand(record_id, pain, occurred_at, side="right", region="ring_finger"):
    return {
        "id": record_id,
        "pain": pain,
        "occurred_at": occurred_at,
        "side": side,
        "region": region,
        "note": "Self-reported discomfort",
    }


def test_empty_profile_keeps_ability_unknown_and_requests_evidence():
    profile = build_profile([], [], [], [])

    assert profile["terrain"] == {
        terrain: {
            "sample_count": 0,
            "completed_count": 0,
            "completion_rate": None,
            "evidence_ids": [],
            "ability_score": None,
        }
        for terrain in ("slab", "vertical", "overhang")
    }
    assert profile["radar"] == {
        "precise_footwork": None,
        "balance": None,
        "body_tension": None,
        "sustained_effort": None,
        "dynamic_coordination": None,
    }
    assert profile["focus"]["kind"] == "gather_evidence"
    assert profile["focus"]["evidence_ids"] == []
    assert profile["active_hand_flags"] == []


def test_climb_summaries_count_outcomes_independently_across_style_grid():
    profile = build_profile(
        [
            climb("s1", completed=True),
            climb("s2", movement="dynamic"),
            climb("v1", terrain="vertical", movement="dynamic", completed=True),
        ],
        [],
        [],
        [],
    )

    assert profile["terrain"]["slab"] == {
        "sample_count": 2,
        "completed_count": 1,
        "completion_rate": 0.5,
        "evidence_ids": ["s1", "s2"],
        "ability_score": None,
    }
    assert profile["terrain"]["vertical"]["completion_rate"] == 1
    assert profile["terrain"]["overhang"]["completion_rate"] is None
    assert profile["movement"]["controlled"]["completion_rate"] == 1
    assert profile["movement"]["dynamic"]["completion_rate"] == 0.5
    assert profile["movement"]["dynamic"]["evidence_ids"] == ["s2", "v1"]
    assert profile["grid"]["slab"]["dynamic"]["completion_rate"] == 0
    assert profile["grid"]["vertical"]["controlled"]["sample_count"] == 0
    assert set(profile["grid"]) == {"slab", "vertical", "overhang"}
    assert all(value is None for value in profile["radar"].values())


def test_two_style_climb_counts_under_each_movement_but_once_per_terrain():
    both = {
        **climb("both", terrain="overhang", movement="dynamic"),
        "movements": ["dynamic", "controlled"],
    }
    older = climb("older", terrain="overhang", movement="dynamic", completed=True)
    assert "movements" not in older

    profile = build_profile([both, older], [], [], [])

    assert profile["terrain"]["overhang"]["sample_count"] == 2
    assert profile["terrain"]["overhang"]["evidence_ids"] == ["both", "older"]
    assert profile["movement"]["controlled"]["evidence_ids"] == ["both"]
    assert profile["movement"]["dynamic"]["evidence_ids"] == ["both", "older"]
    assert profile["movement"]["dynamic"]["completion_rate"] == 0.5
    assert profile["grid"]["overhang"]["controlled"]["evidence_ids"] == ["both"]
    assert profile["grid"]["overhang"]["dynamic"]["evidence_ids"] == ["both", "older"]
    assert profile["grid"]["slab"]["controlled"]["sample_count"] == 0


def test_assessment_trend_skips_every_incompatible_setup_and_preserves_evidence():
    previous = assessment("previous", 90, "2026-10-01T08:00:00Z", confidence=0.8)
    latest = assessment("latest", 100, "2026-10-03T08:00:00Z", confidence=0.95)
    observations = [
        latest,
        assessment("unit", 1.7, "2026-10-02T10:00:00Z", unit="radians"),
        assessment("protocol", 99, "2026-10-02T11:00:00Z", protocol="standing-v1"),
        assessment("method", 99, "2026-10-02T12:00:00Z", method="camera"),
        assessment("metric", 99, "2026-10-02T13:00:00Z", metric="shoulder_reach"),
        previous,
    ]

    profile = build_profile([], observations, [], [])

    assert profile["assessment_trends"]["leg_spread"] == {
        "latest": latest,
        "previous": previous,
        "delta": 10,
    }
    assert profile["assessment_trends"]["shoulder_reach"]["latest"]["id"] == "metric"
    assert all(value is None for value in profile["radar"].values())


def test_noncomparable_assessments_have_no_previous_or_delta():
    latest = assessment("latest", 100, "2026-10-03T08:00:00Z")
    profile = build_profile(
        [],
        [assessment("different", 80, "2026-10-02T08:00:00Z", method="camera"), latest],
        [],
        [],
    )

    assert profile["assessment_trends"]["leg_spread"] == {
        "latest": latest,
        "previous": None,
        "delta": None,
    }


def test_latest_hand_reports_clear_regions_independently_without_changing_climbs():
    cleared = hand("clear", 0, "2026-10-03T08:00:00Z")
    left = hand("left", 2, "2026-10-02T08:00:00Z", side="left")
    palm = hand("palm", 4, "2026-10-03T09:00:00Z", region="palm")
    climbs = [climb("s1", completed=True)]
    profile = build_profile(
        climbs,
        [],
        [cleared, palm, hand("old", 7, "2026-10-01T08:00:00Z"), left],
        [],
    )

    assert profile["active_hand_flags"] == [palm, left]
    assert profile["terrain"] == build_profile(climbs, [], [], [])["terrain"]


def test_unrated_soreness_is_an_active_flag_until_a_zero_report_clears_it():
    unrated = hand("unrated", None, "2026-10-02T08:00:00Z")
    other = hand("other", None, "2026-10-02T09:00:00Z", side="left", region="index_finger")
    cleared = hand("cleared", 0, "2026-10-03T08:00:00Z", side="left", region="index_finger")

    assert build_profile([], [], [unrated], [])["active_hand_flags"] == [unrated]
    assert build_profile([], [], [unrated, other, cleared], [])["active_hand_flags"] == [unrated]


def test_hand_chronology_uses_instants_and_last_input_wins_timestamp_ties():
    earlier = hand("earlier", 0, "2026-10-03T10:00:00+03:00")
    later = hand("later", 4, "2026-10-03T08:00:00Z")
    tie_clear = hand("tie-clear", 0, "2026-10-03T10:00:00+02:00")

    assert build_profile([], [], [later, earlier], [])["active_hand_flags"] == [later]
    assert build_profile([], [], [later, earlier, tie_clear], [])["active_hand_flags"] == []


def test_sparse_climb_evidence_requests_logging_without_inventing_weakness():
    profile = build_profile(
        [climb("o1", terrain="overhang"), climb("o2", terrain="overhang")], [], [], []
    )

    assert profile["focus"]["kind"] == "gather_evidence"
    assert "terrain" not in profile["focus"]
    assert all(summary["ability_score"] is None for summary in profile["terrain"].values())


def test_reflection_focus_uses_lowest_completion_fraction_with_three_records():
    climbs = [
        climb("s1", completed=True),
        climb("s2", completed=True),
        climb("s3"),
        climb("v1", terrain="vertical", completed=True),
        climb("v2", terrain="vertical"),
        climb("v3", terrain="vertical"),
        climb("o1", terrain="overhang"),
        climb("o2", terrain="overhang"),
    ]

    focus = build_profile(climbs, [], [], [])["focus"]

    assert focus["kind"] == "reflection"
    assert focus["terrain"] == "vertical"
    assert focus["evidence_ids"] == ["v1", "v2", "v3"]
    assert "1 of 3" in focus["reason"]
    assert "physical limitation" in focus["reason"]


def test_deletion_recomputes_focus_and_removes_deleted_evidence():
    climbs = [climb("s1"), climb("s2"), climb("s3")]
    before = build_profile(climbs, [], [], [])
    after = build_profile(climbs[:-1], [], [], [])

    assert before["focus"]["kind"] == "reflection"
    assert after["focus"]["kind"] == "gather_evidence"
    assert after["terrain"]["slab"]["evidence_ids"] == ["s1", "s2"]


def test_activity_context_preserves_manual_sources_without_changing_style_ability():
    activities = [
        {
            "id": "run",
            "kind": "running",
            "duration_minutes": 30,
            "source": "manual",
            "occurred_at": "2026-10-03T08:00:00Z",
        },
        {
            "id": "walk",
            "kind": "walking",
            "duration_minutes": 20,
            "source": "manual",
            "occurred_at": "2026-10-02T08:00:00Z",
        },
    ]
    profile = build_profile([], [], [], activities)

    assert profile["activity_context"] == {
        "record_count": 2,
        "duration_minutes": 50,
        "latest": activities[0],
        "evidence_ids": ["run", "walk"],
    }
    assert profile["terrain"] == build_profile([], [], [], [])["terrain"]
    assert all(value is None for value in profile["radar"].values())


def test_profile_derivation_preserves_inputs_and_returns_independent_record_snapshots():
    climbs = [climb("s1"), climb("s2"), climb("s3")]
    assessments = [assessment("test", 95, "2026-10-03T08:00:00Z")]
    hands = [hand("hand", 2, "2026-10-03T08:00:00Z")]
    inputs = (climbs, assessments, hands, [])
    original = deepcopy(inputs)

    profile = build_profile(*inputs)

    assert inputs == original
    profile["assessment_trends"]["leg_spread"]["latest"]["value"] = 999
    profile["active_hand_flags"][0]["pain"] = 10
    assert inputs == original
    assert build_profile(*inputs)["assessment_trends"]["leg_spread"]["latest"]["value"] == 95
