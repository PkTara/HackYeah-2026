"""Derive a descriptive climbing profile from user-confirmed evidence."""

from datetime import datetime

TERRAINS = ("slab", "vertical", "overhang")
MOVEMENTS = ("controlled", "dynamic")


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
        "radar": dict.fromkeys(
            (
                "precise_footwork",
                "balance",
                "body_tension",
                "sustained_effort",
                "dynamic_coordination",
            )
        ),
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
