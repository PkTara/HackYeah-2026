"""Transient pose estimates from front-facing captures."""

import math
from io import BytesIO
from pathlib import Path

from PIL import Image


def _invalid(reason: str, confidence: float = 0.0) -> dict:
    return {
        "status": "invalid_capture",
        "metric": "leg_spread",
        "value": None,
        "unit": "degrees",
        "confidence": confidence,
        "reason": reason,
        "method": "camera",
        "protocol": "front-facing-leg-spread-v1",
    }


def analyze_landmarks(
    landmarks: list[dict],
    min_visibility: float = 0.7,
    *,
    image_size: tuple[int, int] | None = None,
) -> dict:
    """Estimate a 2D projected spread, not true flexibility or calibrated distance.

    Coordinates are normalized to image width and height. Supply image_size to
    correct aspect ratio; without it the estimate assumes a square image plane.
    Confidence is the minimum visibility of the required hips and ankles only.
    """
    if (
        type(min_visibility) not in (int, float)
        or not math.isfinite(min_visibility)
        or not 0 <= min_visibility <= 1
    ):
        return _invalid("The visibility threshold must be a finite number between zero and one.")
    if image_size is not None and (
        len(image_size) != 2 or any(not math.isfinite(size) or size <= 0 for size in image_size)
    ):
        return _invalid("Image width and height must be positive finite dimensions.")
    if len(landmarks) != 33:
        return _invalid("A capture must contain 33 pose landmarks.")
    required = [landmarks[index] for index in (23, 24, 27, 28)]
    if any(not all(key in point for key in ("x", "y", "visibility")) for point in required):
        return _invalid("Required landmarks need x, y and visibility fields.")
    if any(
        type(point[key]) not in (int, float)
        for point in required
        for key in ("x", "y", "visibility")
    ):
        return _invalid("Required landmark coordinates and visibility must be numbers.")
    if any(not math.isfinite(point[key]) for point in required for key in ("x", "y")):
        return _invalid("Required landmark coordinates must be finite.")
    if any(not 0 <= point[key] <= 1 for point in required for key in ("x", "y")):
        return _invalid("Both hips and ankles must be inside the image.")
    if any(not math.isfinite(point["visibility"]) for point in required):
        return _invalid("Required landmark visibility must be finite.")
    if any(not 0 <= point["visibility"] <= 1 for point in required):
        return _invalid("Required landmark visibility must lie between zero and one.")
    confidence = min(point["visibility"] for point in required)
    if confidence < min_visibility:
        return _invalid("Both hips and ankles must be visible.", confidence)
    hip_x = (required[0]["x"] + required[1]["x"]) / 2
    hip_y = (required[0]["y"] + required[1]["y"]) / 2
    aspect = image_size[0] / image_size[1] if image_size is not None else 1.0
    left = ((required[2]["x"] - hip_x) * aspect, required[2]["y"] - hip_y)
    right = ((required[3]["x"] - hip_x) * aspect, required[3]["y"] - hip_y)
    magnitude = math.hypot(*left) * math.hypot(*right)
    if magnitude <= 1e-12:
        return _invalid("The hips and ankles must define two nonzero leg vectors.", confidence)
    cosine = sum(a * b for a, b in zip(left, right)) / magnitude
    return {
        "status": "ok",
        "metric": "leg_spread",
        "value": math.degrees(math.acos(max(-1, min(1, cosine)))),
        "unit": "degrees",
        "confidence": confidence,
        "reason": None,
        "method": "camera",
        "protocol": "front-facing-leg-spread-v1",
    }


def _mediapipe_image(rgb: Image.Image):
    import mediapipe as mp
    import numpy as np

    return mp.Image(image_format=mp.ImageFormat.SRGB, data=np.asarray(rgb))


def _mediapipe_detector(model_path):
    import mediapipe as mp

    options = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(model_path)),
        running_mode=mp.tasks.vision.RunningMode.IMAGE,
        num_poses=1,
    )
    return mp.tasks.vision.PoseLandmarker.create_from_options(options)


class MediaPipePoseAnalyzer:
    """Run optional local-model inference without retaining uploaded image data.

    Detector/image factories are injectable inference boundaries. Defaults use
    MediaPipe Tasks and a new context-managed detector per capture. Invalid
    encoded images raise ValueError; unavailable runtime/model raises
    RuntimeError or OSError, which the HTTP layer can map to service unavailable.
    """

    def __init__(self, model_path, *, detector_factory=None, image_factory=None):
        self.model_path = model_path
        self.detector_factory = detector_factory or _mediapipe_detector
        self.image_factory = image_factory or _mediapipe_image

    def analyze(self, image_bytes: bytes) -> dict:
        try:
            with Image.open(BytesIO(image_bytes)) as source:
                rgb = source.convert("RGB")
        except (OSError, ValueError, Image.DecompressionBombError) as exc:
            raise ValueError("Invalid or unsupported image capture.") from exc
        with rgb:
            if not Path(self.model_path).is_file():
                raise FileNotFoundError("The configured pose model is unavailable.")
            size = rgb.size
            try:
                image = self.image_factory(rgb)
                with self.detector_factory(self.model_path) as detector:
                    detected = detector.detect(image)
            except ImportError as exc:
                raise RuntimeError("The optional MediaPipe pose runtime is unavailable.") from exc
            except ValueError as exc:
                raise RuntimeError("The configured pose runtime or model could not run.") from exc
        if not detected.pose_landmarks:
            return _invalid("No pose was detected in the capture.")
        landmarks = [
            {"x": point.x, "y": point.y, "visibility": point.visibility}
            for point in detected.pose_landmarks[0]
        ]
        return analyze_landmarks(landmarks, image_size=size)
