from datetime import datetime, timezone
from uuid import uuid4

from fastapi import Depends, HTTPException

DEFINITIONS = {
    "record_assessment": {
        "title": "Understand your starting point",
        "target_skill": "assessment",
        "instructions": "Enter an existing measurement or record a comfortable "
        "optional assessment. "
        "You can skip any movement and use manual entry.",
    },
    "reflect_climb": {
        "title": "Reflect on a climbing style",
        "target_skill": "technique",
        "instructions": "Review the linked climbs and note one movement that felt controlled "
        "or difficult. Choose one question to explore in a future session.",
    },
    "recovery_checkin": {
        "title": "Check in with your hands",
        "target_skill": "wellbeing",
        "instructions": "Record how your hand feels today and any change since the previous "
        "report. This is a journal task, not an injury assessment.",
    },
}


def _climb_evidence(climbs):
    return [
        {
            "id": record["id"],
            "label": f"Climb · {record['occurred_at']}",
            "detail": f"{record['terrain']}; "
            f"movements={','.join(record.get('movements') or [record['movement']])}; "
            f"completed={str(record['completed']).lower()}; "
            f"grade={record.get('grade') or 'not recorded'}",
        }
        for record in climbs
    ]


def _comparison(profile):
    return "; ".join(
        f"{name}: {summary['completed_count']}/{summary['sample_count']} completed"
        for name, summary in profile["terrain"].items()
    )


def _hand_evidence(hands):
    return [
        {
            "id": hand["id"],
            "label": f"Hand report · {hand['occurred_at']}",
            "detail": f"{hand['side']} {hand['region']}; "
            f"pain={hand['pain'] if hand['pain'] is not None else 'unrated'}; "
            f"spots={','.join(hand.get('spots', [])) or 'not specified'}",
        }
        for hand in hands
    ]


def _context_evidence(profile, goal, hands):
    latest = {}
    for hand in hands:
        key = (hand["side"], hand["region"])
        at = datetime.fromisoformat(hand["occurred_at"].replace("Z", "+00:00"))
        if key not in latest or at >= latest[key][0]:
            latest[key] = (at, hand)
    return [
        {"id": "goal", "label": "Goal at assignment", "detail": f"goal={goal}"},
        {
            "id": "hand-eligibility",
            "label": "Hand eligibility at assignment",
            "detail": f"active hand reports={len(profile['active_hand_flags'])}; "
            f"latest side/region reports={len(latest)}",
        },
        *_hand_evidence([entry[1] for entry in latest.values()]),
    ]


def recommendation(profile, goal="general", climbs=(), hands=()):
    if profile["active_hand_flags"]:
        return {
            "decision": {
                "summary": "Reported hand discomfort prioritized a journal check-in.",
                "status": "app_rule",
                "rule": "server-hand-checkin-v1: latest report per side/region with "
                "pain null or >0 takes priority over goal and climb reflection.",
                "evidence": [
                    {
                        "id": flag["id"],
                        "label": f"Hand report · {flag['occurred_at']}",
                        "detail": f"{flag['side']} {flag['region']}; "
                        f"pain={flag['pain'] if flag['pain'] is not None else 'unrated'}; "
                        f"spots={','.join(flag.get('spots', [])) or 'not specified'}",
                    }
                    for flag in profile["active_hand_flags"]
                ],
                "source_ids": ["klauser2002"],
                "limitations": [
                    "Inputs are snapshots at assignment, not current live state.",
                    "A conservative product selection rule, not diagnosis, healing assessment "
                    "or evidence that pausing suggestions prevents injury.",
                    "The 1-minute estimate is a product choice.",
                    "Klauser 2002 studied specialized internal imaging, not this journal.",
                ],
            },
            "kind": "recovery_checkin",
            "reason": "Current hand discomfort was reported; record a wellbeing check-in.",
            "evidence_ids": [flag["id"] for flag in profile["active_hand_flags"]],
            "estimated_minutes": 1,
        }
    if goal == "mobility":
        return {
            "decision": {
                "summary": "Your selected mobility goal asks for comparable assessment records.",
                "status": "app_rule",
                "rule": "server-mobility-assessment-v1: with no active hand discomfort, "
                "goal=mobility takes priority over climb reflection.",
                "evidence": _context_evidence(profile, goal, hands),
                "source_ids": ["draga2020", "michailov2018"],
                "limitations": [
                    "Inputs are snapshots at assignment, not current live state.",
                    "The 2-minute estimate is a product choice, not a stretching dose.",
                    "Related studies motivate protocol-specific records; they do not validate "
                    "this app assessment or prove mobility training improves climbing.",
                ],
            },
            "kind": "record_assessment",
            "reason": "Your mobility goal needs comparable evidence; "
            "enter a comfortable assessment.",
            "evidence_ids": [],
            "estimated_minutes": 2,
        }
    focus = profile["focus"]
    if focus["kind"] == "reflection":
        return {
            "decision": {
                "summary": focus["reason"],
                "status": "app_rule",
                "rule": "server-reflection-v1: with no active hand discomfort and goal "
                "other than mobility, consider terrains with >=3 logs and completion "
                "rate <1; choose the lowest completion rate; ties use slab, vertical, overhang.",
                "evidence": [*_climb_evidence(climbs), *_context_evidence(profile, goal, hands)],
                "source_ids": ["orth2018"],
                "limitations": [
                    "Inputs are snapshots at assignment; an assigned quest can remain while "
                    "later records change the current focus.",
                    "The >=3 threshold and 2-minute estimate are product choices, "
                    "not research-derived minimums or doses.",
                    "Completion rates depend on difficulty, exposure and route selection; "
                    "they do not establish a physical limitation.",
                    "Orth 2018 is background learning research; it does not validate "
                    "this reflection task or automated selection.",
                ],
            },
            "kind": "reflect_climb",
            "reason": focus["reason"],
            "evidence_ids": focus["evidence_ids"],
            "estimated_minutes": 2,
        }
    return {
        "decision": {
            "summary": "Gather comparable assessment evidence.",
            "status": "app_rule",
            "rule": "server-gather-evidence-v1: no active hand discomfort, non-mobility goal "
            "and no terrain with >=3 logs and completion rate <1. " + _comparison(profile),
            "evidence": [
                *_context_evidence(profile, goal, hands),
                *_climb_evidence(climbs),
            ],
            "source_ids": ["michailov2018"],
            "limitations": [
                "Inputs are snapshots at assignment, not current live state.",
                "The >=3 threshold and 2-minute estimate are product choices.",
                "Instrumented measurement research supplies background; it does not "
                "validate this app's assessments or personalized selection.",
            ],
        },
        "kind": "record_assessment",
        "reason": "Record a comfortable assessment or enter an existing measurement.",
        "evidence_ids": [],
        "estimated_minutes": 2,
    }


def register_quests(app, store, current_user, profile_for):
    def current_recommendation(user):
        fresh_user = store.climber(user["id"])
        if fresh_user is None:
            raise HTTPException(401, "Climber no longer exists")
        return recommendation(
            profile_for(fresh_user),
            fresh_user["goal"],
            store.records(user["id"], "climbs"),
            store.records(user["id"], "hands"),
        )

    def eligible(quest, user):
        current = current_recommendation(user)
        evidence = {
            record["id"]
            for kind in ("climbs", "assessments", "hands", "activities")
            for record in store.records(user["id"], kind)
        }
        return quest["kind"] == current["kind"] and set(quest["evidence_ids"]) <= evidence

    @app.post("/v1/me/quests", status_code=201)
    def assign(user: dict = Depends(current_user)):
        def candidate_factory():
            candidate = {
                "id": str(uuid4()),
                "status": "assigned",
                **current_recommendation(user),
                "created_at": datetime.now(timezone.utc).isoformat(),
                "completed_at": None,
            }
            candidate.update(DEFINITIONS[candidate["kind"]])
            candidate.update(definition_version="1", completion_method="self_reported")
            return candidate

        return store.assign_quest(
            user["id"], candidate_factory, lambda quest: eligible(quest, user)
        )

    @app.get("/v1/me/quests")
    def quests(user: dict = Depends(current_user)):
        return [
            {**quest, "status": "paused"}
            if quest["status"] == "assigned" and not eligible(quest, user)
            else quest
            for quest in store.quests(user["id"])
        ]

    @app.post("/v1/me/quests/{quest_id}/complete")
    def complete(quest_id: str, user: dict = Depends(current_user)):
        try:
            quest = store.complete_quest(user["id"], quest_id, lambda quest: eligible(quest, user))
        except KeyError:
            raise HTTPException(404, "Quest not found") from None
        except ValueError as error:
            raise HTTPException(409, str(error)) from None
        return {"quest": quest, "pet": store.pet(user["id"])}

    @app.get("/v1/me/pet")
    def pet(user: dict = Depends(current_user)):
        return store.pet(user["id"])

    @app.post("/v1/me/quests/{quest_id}/skip")
    def skip(quest_id: str, user: dict = Depends(current_user)):
        try:
            return store.skip_quest(user["id"], quest_id)
        except KeyError:
            raise HTTPException(404, "Quest not found") from None
        except ValueError as error:
            raise HTTPException(409, str(error)) from None
