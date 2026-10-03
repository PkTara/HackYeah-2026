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


def recommendation(profile, goal="general"):
    if profile["active_hand_flags"]:
        return {
            "kind": "recovery_checkin",
            "reason": "Current hand discomfort was reported; record a wellbeing check-in.",
            "evidence_ids": [flag["id"] for flag in profile["active_hand_flags"]],
            "estimated_minutes": 1,
        }
    if goal == "mobility":
        return {
            "kind": "record_assessment",
            "reason": "Your mobility goal needs comparable evidence; "
            "enter a comfortable assessment.",
            "evidence_ids": [],
            "estimated_minutes": 2,
        }
    focus = profile["focus"]
    if focus["kind"] == "reflection":
        return {
            "kind": "reflect_climb",
            "reason": focus["reason"],
            "evidence_ids": focus["evidence_ids"],
            "estimated_minutes": 2,
        }
    return {
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
        return recommendation(profile_for(fresh_user), fresh_user["goal"])

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
