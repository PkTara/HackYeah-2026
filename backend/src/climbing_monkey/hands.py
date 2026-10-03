from datetime import datetime
from typing import get_args

from fastapi import Depends
from pydantic import AwareDatetime

from .schemas import HandRegion


def register_hands(app, store, current_user):
    @app.get("/v1/me/hands/heatmap")
    def heatmap(at: AwareDatetime | None = None, user: dict = Depends(current_user)):
        result = {
            side: {
                region: {"pain": None, "occurred_at": None, "evidence_id": None}
                for region in get_args(HandRegion)
            }
            for side in ("left", "right")
        }
        for record in store.records(user["id"], "hands"):
            if at is None or datetime.fromisoformat(record["occurred_at"]) <= at:
                result[record["side"]][record["region"]] = {
                    "pain": record["pain"],
                    "occurred_at": record["occurred_at"],
                    "evidence_id": record["id"],
                }
        return result
