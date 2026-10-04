"""Transient pose estimates from front-facing captures."""

import json
import math
from io import BytesIO
from pathlib import Path

from PIL import Image


def _invalid(reason: str, confidence: float = 0.0, *, metric="leg_spread") -> dict:
    return {
        **({"left_value": None, "right_value": None} if metric == "shoulder_reach" else {}),
        "status": "invalid_capture",
        "metric": metric,
        "value": None,
        "unit": "degrees",
        "confidence": confidence,
        "reason": reason,
        "method": "camera",
        "protocol": (
            "front-facing-overhead-reach-v1"
            if metric == "shoulder_reach"
            else "front-facing-leg-spread-v1"
        ),
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
    value = math.degrees(math.acos(max(-1, min(1, cosine))))
    return {
        "decision": {
            "summary": f"Estimated image-plane leg-spread angle: {value:g} degrees.",
            "status": "estimate",
            "rule": "camera-leg-spread-v1 / front-facing-leg-spread-v1: average the hips "
            "to form the hip midpoint; subtract it from each ankle; multiply horizontal "
            "coordinates by width/height (1 if absent); angle = degrees(acos(clamp("
            "dot(left,right)/(length(left)*length(right)), -1, 1))). "
            "Require finite in-frame hips/ankles, visibility >= threshold and nonzero vectors.",
            "evidence": [
                {
                    "id": f"landmark-{index}",
                    "label": name,
                    "detail": json.dumps({key: point[key] for key in ("x", "y", "visibility")}),
                }
                for index, name, point in zip(
                    (23, 24, 27, 28),
                    ("Left hip", "Right hip", "Left ankle", "Right ankle"),
                    required,
                    strict=True,
                )
            ]
            + [
                {
                    "id": "capture-geometry",
                    "label": "Image dimensions and quality threshold",
                    "detail": json.dumps(
                        {
                            "width": image_size[0] if image_size else None,
                            "height": image_size[1] if image_size else None,
                            "aspect_ratio": aspect,
                            "square_assumption": image_size is None,
                            "visibility_threshold": min_visibility,
                        }
                    ),
                }
            ],
            "source_ids": ["draga2020", "stenum2021", "barzegar2024"],
            "limitations": [
                "Actual inputs for this analyzed image/frame; capture timestamp and "
                "model/version unavailable in this response.",
                "Minimum landmark visibility is not angle accuracy or an error bound.",
                "Projected ankle-to-hip-midpoint geometry is not validated hip mobility "
                "or true 3D joint range; viewpoint, bent knees and out-of-plane motion affect it.",
                "Related papers use other tasks, protocols or hardware; none validates "
                "this app metric or a flexibility-to-terrain mapping.",
            ],
        },
        "status": "ok",
        "metric": "leg_spread",
        "value": value,
        "unit": "degrees",
        "confidence": confidence,
        "reason": None,
        "method": "camera",
        "protocol": "front-facing-leg-spread-v1",
    }


def analyze_shoulder_landmarks(landmarks, min_visibility=0.7, *, image_size=None):
    """Projected hip→shoulder→elbow angles for the front-facing reach protocol."""

    def invalid(reason, confidence=0.0):
        return _invalid(reason, confidence, metric="shoulder_reach")

    if (
        type(min_visibility) not in (int, float)
        or not math.isfinite(min_visibility)
        or not 0 <= min_visibility <= 1
    ):
        return invalid("The visibility threshold must be a finite number between zero and one.")
    if image_size is not None and (
        len(image_size) != 2 or any(not math.isfinite(size) or size <= 0 for size in image_size)
    ):
        return invalid("Image width and height must be positive finite dimensions.")
    if len(landmarks) != 33:
        return invalid("A capture must contain 33 pose landmarks.")
    required = [landmarks[i] for i in (11, 12, 13, 14, 15, 16, 23, 24)]
    if any(
        type(point.get(key)) not in (int, float)
        or not math.isfinite(point[key])
        or not 0 <= point[key] <= 1
        for point in required
        for key in ("x", "y", "visibility")
    ):
        return invalid("Required hips, shoulders, elbows and wrists need normalized finite fields.")
    confidence = min(point["visibility"] for point in required)
    if confidence < min_visibility:
        return invalid("Both hips, shoulders, elbows and wrists must be visible.", confidence)
    aspect = image_size[0] / image_size[1] if image_size is not None else 1.0

    def angle(a, vertex, b):
        left = ((a["x"] - vertex["x"]) * aspect, a["y"] - vertex["y"])
        right = ((b["x"] - vertex["x"]) * aspect, b["y"] - vertex["y"])
        magnitude = math.hypot(*left) * math.hypot(*right)
        if magnitude <= 1e-12:
            return None
        cosine = sum(a * b for a, b in zip(left, right)) / magnitude
        return math.degrees(math.acos(max(-1, min(1, cosine))))

    for shoulder, elbow, wrist in ((11, 13, 15), (12, 14, 16)):
        elbow_angle = angle(landmarks[shoulder], landmarks[elbow], landmarks[wrist])
        if elbow_angle is None or elbow_angle < 160:
            return invalid("Keep both elbows straight for overhead shoulder reach.", confidence)
    left = angle(landmarks[23], landmarks[11], landmarks[13])
    right = angle(landmarks[24], landmarks[12], landmarks[14])
    if left is None or right is None:
        return invalid("Hips, shoulders and elbows must define nonzero vectors.", confidence)
    return {
        "decision": {
            "summary": f"Estimated image-plane shoulder reach: left {left:g}, "
            f"right {right:g}, mean {(left + right) / 2:g} degrees.",
            "status": "estimate",
            "rule": "camera-shoulder-reach-v1 / front-facing-overhead-reach-v1: "
            "for each side form hip-to-shoulder and elbow-to-shoulder vectors; "
            "multiply horizontal coordinates by width/height (1 if absent); "
            "angle = degrees(acos(clamp(dot(a,b)/(length(a)*length(b)), -1, 1))). "
            "Report left and right angles and their arithmetic mean. Require finite "
            "in-frame hips, shoulders, elbows and wrists, visibility >= threshold, "
            "nonzero vectors and shoulder-elbow-wrist angles >=160 degrees.",
            "evidence": [
                {
                    "id": f"landmark-{index}",
                    "label": name,
                    "detail": json.dumps({key: point[key] for key in ("x", "y", "visibility")}),
                }
                for index, name, point in zip(
                    (11, 12, 13, 14, 15, 16, 23, 24),
                    (
                        "Left shoulder",
                        "Right shoulder",
                        "Left elbow",
                        "Right elbow",
                        "Left wrist",
                        "Right wrist",
                        "Left hip",
                        "Right hip",
                    ),
                    required,
                    strict=True,
                )
            ]
            + [
                {
                    "id": "capture-geometry",
                    "label": "Image dimensions and quality thresholds",
                    "detail": json.dumps(
                        {
                            "width": image_size[0] if image_size else None,
                            "height": image_size[1] if image_size else None,
                            "aspect_ratio": aspect,
                            "square_assumption": image_size is None,
                            "visibility_threshold": min_visibility,
                            "minimum_elbow_angle": 160,
                        }
                    ),
                }
            ],
            "source_ids": ["stenum2021", "barzegar2024"],
            "limitations": [
                "Actual inputs for this analyzed image/frame; capture timestamp and "
                "model/version unavailable in this response.",
                "Minimum landmark visibility is not angle accuracy or an error bound.",
                "Projected hip-shoulder-elbow geometry is not validated shoulder mobility "
                "or true 3D joint range; viewpoint and out-of-plane motion affect it.",
                "The visibility and 160-degree elbow thresholds are product rules. "
                "Related papers use other tasks, protocols or hardware and do not "
                "validate this app shoulder metric or a mobility-to-terrain mapping.",
            ],
        },
        "status": "ok",
        "metric": "shoulder_reach",
        "value": (left + right) / 2,
        "left_value": left,
        "right_value": right,
        "unit": "degrees",
        "confidence": confidence,
        "reason": None,
        "method": "camera",
        "protocol": "front-facing-overhead-reach-v1",
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
