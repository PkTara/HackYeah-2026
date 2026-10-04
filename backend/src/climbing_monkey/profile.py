"""Derive a descriptive climbing profile from user-confirmed evidence."""

from collections import Counter
from datetime import datetime, timezone

from .schemas import MOVEMENTS

TERRAINS = ("slab", "vertical", "overhang")


def _movements(climb):
    """Styles of a climb. Records saved before `movements` existed have one `movement`."""
    return climb.get("movements") or [climb["movement"]]


def _summarize(climbs):
    completed_count = sum(record["completed"] for record in climbs)
    return {
        "sample_count": len(climbs),
        "completed_count": completed_count,
        "completion_rate": completed_count / len(climbs) if climbs else None,
        "evidence_ids": [record["id"] for record in climbs],
        "ability_score": None,
    }


def _newest_first(records):
    def order(item):
        index, record = item
        occurred_at = record["occurred_at"]
        if isinstance(occurred_at, str):
            occurred_at = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))
        return occurred_at.timestamp(), index

    return [record for _, record in sorted(enumerate(records), key=order, reverse=True)]


def _assessment_trends(assessments):
    by_metric = {}
    for record in _newest_first(assessments):
        by_metric.setdefault(record["metric"], []).append(record)
    trends = {}
    for metric, history in by_metric.items():
        latest = history[0]
        previous = next(
            (
                record
                for record in history[1:]
                if all(record[key] == latest[key] for key in ("protocol", "method", "unit"))
                and record.get("side") == latest.get("side")
                and record.get("setup") == latest.get("setup")
                and record.get("simulated", False) == latest.get("simulated", False)
            ),
            None,
        )
        trends[metric] = {
            "latest": dict(latest),
            "previous": dict(previous) if previous is not None else None,
            "delta": latest["value"] - previous["value"] if previous is not None else None,
        }
    return trends


def _active_hand_flags(hands):
    latest_by_region = {}
    for record in _newest_first(hands):
        latest_by_region.setdefault((record["side"], record["region"]), record)
    # Pain None means sore without a rating, which is still an active flag; 0 clears it.
    return [
        dict(record)
        for record in latest_by_region.values()
        if record["pain"] is None or record["pain"] > 0
    ]


def _focus(terrain):
    eligible = [
        name
        for name, summary in terrain.items()
        if summary["sample_count"] >= 3 and summary["completion_rate"] < 1
    ]
    if not eligible:
        return {
            "kind": "gather_evidence",
            "reason": "Log climbing outcomes to understand your recorded styles.",
            "evidence_ids": [],
        }
    name = min(eligible, key=lambda name: terrain[name]["completion_rate"])
    summary = terrain[name]
    return {
        "kind": "reflection",
        "terrain": name,
        "reason": (
            f"{summary['completed_count']} of {summary['sample_count']} logged {name} climbs "
            "were completed. Reflect on these outcomes; "
            "they do not establish a physical limitation."
        ),
        "evidence_ids": list(summary["evidence_ids"]),
    }


# Movement radar. The same team rule as packages/core/src/movement.ts: a summary of
# the climber's own records per axis, not a skill test. Each clause is (walls, styles);
# a climb matches a clause when its wall is listed (or no walls are) and it has one of
# the styles (or no styles are listed).
RADAR_AXES = {
    "precise_footwork": ((("slab",), ()), (("vertical",), ("technical", "controlled"))),
    "balance": ((("slab",), ()), ((), ("balance",))),
    "body_tension": ((("overhang",), ()), ((), ("compression", "powerful"))),
    "sustained_effort": (((), ("endurance",)),),
    "dynamic_coordination": (((), ("dynamic", "coordination")),),
}
RADAR_MIN_CLIMBS = 3
RADAR_LEVELS = ((8, 3, "Established"), (4, 2, "Building"), (0, 1, "Started"))
# Home tests the server stores, with the team marks for 1, 2 and 3 points. The plank
# and one-leg balance tests stay on the device, so the server scores tension and
# balance from climbs alone.
RADAR_TESTS = {"sustained_effort": ("hang_duration", (20, 40, 60))}
# Sustained effort also counts days with this many climbs or more.
RADAR_LONG_SESSIONS = {"sustained_effort"}
LONG_SESSION_CLIMBS = 5


def _matches_axis(clauses, climb):
    styles = _movements(climb)
    return any(
        (not walls or climb["terrain"] in walls)
        and (not wanted or any(style in styles for style in wanted))
        for walls, wanted in clauses
    )


def _radar_test(axis, assessments):
    if axis not in RADAR_TESTS:
        return None, None
    metric, marks = RADAR_TESTS[axis]
    latest = next(
        (
            record
            for record in _newest_first(assessments)
            if record["metric"] == metric and record["method"] == "manual"
        ),
        None,
    )
    if latest is None:
        return None, None
    return latest, sum(latest["value"] >= mark for mark in marks)


def _utc_day(record):
    occurred_at = record["occurred_at"]
    if isinstance(occurred_at, str):
        occurred_at = datetime.fromisoformat(occurred_at.replace("Z", "+00:00"))
    return occurred_at.astimezone(timezone.utc).date()


def _long_sessions(climbs):
    """Days with LONG_SESSION_CLIMBS or more logged climbs, on any wall."""
    per_day = Counter(_utc_day(record) for record in climbs)
    return sum(count >= LONG_SESSION_CLIMBS for count in per_day.values())


def _radar_axis(axis, clauses, climbs, assessments):
    matching = [record for record in climbs if _matches_axis(clauses, record)]
    test, test_points = _radar_test(axis, assessments)
    if len(matching) < RADAR_MIN_CLIMBS and test is None:
        return None
    sent = sum(record["completed"] for record in matching)
    long_sessions = _long_sessions(climbs) if axis in RADAR_LONG_SESSIONS else 0
    points = sent + (test_points or 0) + long_sessions
    _, level, name = next(level for level in RADAR_LEVELS if points >= level[0])
    return {
        "level": level,
        "level_name": name,
        "points": points,
        "climb_count": len(matching),
        "sent_count": sent,
        "test_points": test_points,
        "long_sessions": long_sessions,
        "evidence_ids": [record["id"] for record in matching]
        + ([test["id"]] if test is not None else []),
    }


def build_profile(climbs, assessments, hands, activities) -> dict:
    """Build a profile from validated record dictionaries."""
    terrain = {
        terrain: _summarize([record for record in climbs if record["terrain"] == terrain])
        for terrain in TERRAINS
    }
    return {
        "terrain": terrain,
        "movement": {
            movement: _summarize([record for record in climbs if movement in _movements(record)])
            for movement in MOVEMENTS
        },
        "grid": {
            terrain: {
                movement: _summarize(
                    [
                        record
                        for record in climbs
                        if record["terrain"] == terrain and movement in _movements(record)
                    ]
                )
                for movement in MOVEMENTS
            }
            for terrain in TERRAINS
        },
        "radar": {
            axis: _radar_axis(axis, clauses, climbs, assessments)
            for axis, clauses in RADAR_AXES.items()
        },
        "focus": _focus(terrain),
        "active_hand_flags": _active_hand_flags(hands),
        "assessment_trends": _assessment_trends(assessments),
        "activity_context": {
            "record_count": len(activities),
            "duration_minutes": sum(record["duration_minutes"] for record in activities),
            "latest": dict(_newest_first(activities)[0]) if activities else None,
            "evidence_ids": [record["id"] for record in activities],
        },
    }
