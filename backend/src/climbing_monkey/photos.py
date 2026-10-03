from datetime import datetime, timezone
from typing import Literal
from uuid import uuid4

from fastapi import Depends, Form, HTTPException, Response, UploadFile

from .images import read_image


def register_photos(app, store, current_user):
    @app.post("/v1/me/photos", status_code=201)
    def create(
        file: UploadFile,
        side: Literal["left", "right"] = Form(...),
        view: Literal["palm", "back"] = Form(...),
        upload_consent: bool = Form(False),
        retain_consent: bool = Form(False),
        user: dict = Depends(current_user),
    ):
        if not upload_consent or not retain_consent:
            raise HTTPException(403, "Explicit upload and retention consent are required")
        data, width, height = read_image(file)
        metadata = {
            "id": str(uuid4()),
            "side": side,
            "view": view,
            "width": width,
            "height": height,
            "content_type": "image/jpeg",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        return store.save_photo(user["id"], metadata, data)

    @app.get("/v1/me/photos")
    def photos(user: dict = Depends(current_user)):
        return store.photos(user["id"])

    @app.get("/v1/me/photos/{photo_id}")
    def photo(photo_id: str, user: dict = Depends(current_user)):
        result = store.photo(user["id"], photo_id)
        if result is None:
            raise HTTPException(404, "Photo not found")
        return Response(result[1], media_type="image/jpeg", headers={"Cache-Control": "no-store"})

    @app.delete("/v1/me/photos/{photo_id}", status_code=204)
    def delete(photo_id: str, user: dict = Depends(current_user)):
        if not store.delete_photo(user["id"], photo_id):
            raise HTTPException(404, "Photo not found")
        return Response(status_code=204)
