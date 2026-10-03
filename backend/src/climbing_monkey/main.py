import os
from hashlib import sha256
from pathlib import Path
from secrets import token_urlsafe
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException, Response
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .hands import register_hands
from .photos import register_photos
from .pose_routes import register_pose
from .profile import build_profile
from .quests import register_quests
from .records import register_records
from .schemas import (
    ActivityCreate,
    AssessmentCreate,
    ClimbCreate,
    ClimberCreate,
    ClimberUpdate,
    HandCreate,
)
from .store import Store


def create_app(database_path=None, pose_analyzer=None) -> FastAPI:
    app = FastAPI(title="Climbing Monkey API")
    origins = [
        value.strip()
        for value in os.environ.get("MONKEY_CORS_ORIGINS", "").split(",")
        if value.strip()
    ]
    if origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_methods=["GET", "POST", "PATCH", "DELETE"],
            allow_headers=["Authorization", "Content-Type"],
        )

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request, error):
        details = [{key: item[key] for key in ("type", "loc", "msg")} for item in error.errors()]
        return JSONResponse(status_code=422, content={"detail": details})

    store = Store(
        database_path
        or os.environ.get("MONKEY_DATABASE_PATH")
        or Path(__file__).resolve().parents[2] / "data/monkey.sqlite3"
    )
    app.state.store = store
    bearer = HTTPBearer(auto_error=False)

    def current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
        digest = sha256(credentials.credentials.encode()).hexdigest() if credentials else None
        user = store.authenticate(digest)
        if user is None:
            raise HTTPException(401, "Invalid or missing bearer token")
        return user

    @app.get("/health")
    def health():
        return {"status": "ok"}

    @app.post("/v1/climbers", status_code=201)
    def create_climber(payload: ClimberCreate):
        token = token_urlsafe(32)
        user = {"id": str(uuid4()), **payload.model_dump(), "pet_visible": True}
        store.create_climber(user, sha256(token.encode()).hexdigest())
        return {**user, "token": token}

    @app.get("/v1/me")
    def me(user: dict = Depends(current_user)):
        return user

    @app.patch("/v1/me")
    def update_me(payload: ClimberUpdate, user: dict = Depends(current_user)):
        return store.update_climber({**user, **payload.model_dump(exclude_none=True)})

    @app.delete("/v1/me", status_code=204)
    def delete_me(user: dict = Depends(current_user)):
        store.delete_climber(user["id"])
        return Response(status_code=204)

    @app.get("/v1/me/profile")
    def profile(user: dict = Depends(current_user)):
        return build_profile(
            *(
                store.records(user["id"], kind)
                for kind in ("climbs", "assessments", "hands", "activities")
            )
        )

    @app.get("/v1/me/export")
    def export(user: dict = Depends(current_user)):
        return {
            "climber": user,
            "records": {
                kind: store.records(user["id"], kind)
                for kind in ("climbs", "assessments", "hands", "activities")
            },
            "photos": store.photos(user["id"]),
            "quests": store.quests(user["id"]),
            "pet": store.pet(user["id"]),
        }

    register_records(app, store, current_user, "climbs", ClimbCreate)
    register_records(app, store, current_user, "assessments", AssessmentCreate)
    register_records(app, store, current_user, "hands", HandCreate)
    register_records(app, store, current_user, "activities", ActivityCreate)
    register_quests(app, store, current_user, profile)
    register_pose(app, current_user, pose_analyzer)
    register_photos(app, store, current_user)
    register_hands(app, store, current_user)

    return app
