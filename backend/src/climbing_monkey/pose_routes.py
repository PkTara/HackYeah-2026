import os

from fastapi import Depends, Form, HTTPException, UploadFile

from .images import read_image
from .pose import MediaPipePoseAnalyzer, analyze_landmarks
from .schemas import LandmarkRequest


def register_pose(app, current_user, pose_analyzer):
    @app.post("/v1/pose/landmarks")
    def landmarks(payload: LandmarkRequest, user: dict = Depends(current_user)):
        size = (payload.image_width, payload.image_height) if payload.image_width else None
        return analyze_landmarks(
            [landmark.model_dump() for landmark in payload.landmarks], image_size=size
        )

    @app.post("/v1/pose/image")
    def image(
        file: UploadFile, upload_consent: bool = Form(False), user: dict = Depends(current_user)
    ):
        if not upload_consent:
            raise HTTPException(403, "Explicit upload consent is required")
        data, _, _ = read_image(file)
        analyzer = pose_analyzer
        if analyzer is None:
            path = os.environ.get("POSE_MODEL_PATH")
            if not path:
                raise HTTPException(503, "Pose analyzer is not configured")
            analyzer = MediaPipePoseAnalyzer(path)
        try:
            return analyzer.analyze(data)
        except ValueError:
            raise HTTPException(400, "Image could not be analyzed") from None
        except (RuntimeError, OSError):
            raise HTTPException(503, "Pose runtime or model is unavailable") from None
