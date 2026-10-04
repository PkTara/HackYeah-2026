import builtins
import math
from io import BytesIO
from types import SimpleNamespace

import pytest
from PIL import Image

from climbing_monkey.pose import MediaPipePoseAnalyzer, analyze_landmarks


def visible_pose():
    landmarks = [{"x": 0.5, "y": 0.5, "visibility": 0.9} for _ in range(33)]
    landmarks[23].update(x=0.45, y=0.25)
    landmarks[24].update(x=0.55, y=0.25)
    landmarks[27].update(x=0.25, y=0.5)
    landmarks[28].update(x=0.75, y=0.5)
    return landmarks


def test_known_planar_leg_spread_from_hip_midpoint():
    result = analyze_landmarks(visible_pose())

    assert {key: value for key, value in result.items() if key != "decision"} == {
        "status": "ok",
        "metric": "leg_spread",
        "value": 90.0,
        "unit": "degrees",
        "confidence": 0.9,
        "reason": None,
        "method": "camera",
        "protocol": "front-facing-leg-spread-v1",
    }


def test_missing_required_landmarks_returns_invalid_capture():
    result = analyze_landmarks(visible_pose()[:28])

    assert result["status"] == "invalid_capture"
    assert result["value"] is None
    assert result["confidence"] == 0.0
    assert result["reason"]


def test_low_required_visibility_returns_invalid_capture():
    landmarks = visible_pose()
    landmarks[28]["visibility"] = 0.69

    result = analyze_landmarks(landmarks)

    assert result["status"] == "invalid_capture"
    assert result["value"] is None
    assert result["confidence"] == 0.69


def test_degenerate_leg_vector_returns_invalid_capture():
    landmarks = visible_pose()
    landmarks[27].update(x=0.5, y=0.25)

    result = analyze_landmarks(landmarks)

    assert result["status"] == "invalid_capture"
    assert result["value"] is None
    assert result["reason"]


def test_nonfinite_required_coordinate_returns_invalid_capture():
    landmarks = visible_pose()
    landmarks[27]["x"] = math.nan

    result = analyze_landmarks(landmarks)

    assert result["status"] == "invalid_capture"
    assert result["value"] is None
    assert math.isfinite(result["confidence"])


def test_out_of_frame_required_coordinate_returns_invalid_capture():
    landmarks = visible_pose()
    landmarks[28]["y"] = 1.01

    result = analyze_landmarks(landmarks)

    assert result["status"] == "invalid_capture"
    assert result["value"] is None


def test_nonfinite_visibility_cannot_create_a_metric():
    landmarks = visible_pose()
    landmarks[23]["visibility"] = math.nan

    result = analyze_landmarks(landmarks)

    assert result["status"] == "invalid_capture"
    assert result["value"] is None
    assert result["confidence"] == 0.0


def test_out_of_range_visibility_cannot_create_a_metric():
    landmarks = visible_pose()
    landmarks[23]["visibility"] = 1.01

    result = analyze_landmarks(landmarks)

    assert result["status"] == "invalid_capture"
    assert result["value"] is None


def test_missing_required_landmark_field_returns_invalid_capture():
    landmarks = visible_pose()
    del landmarks[24]["visibility"]

    result = analyze_landmarks(landmarks)

    assert result["status"] == "invalid_capture"
    assert result["value"] is None


def test_unused_landmarks_do_not_veto_visible_hips_and_ankles():
    landmarks = visible_pose()
    for index in set(range(33)) - {23, 24, 27, 28}:
        landmarks[index] = {}
    landmarks[28]["visibility"] = 0.7

    result = analyze_landmarks(landmarks)

    assert result["status"] == "ok"
    assert result["value"] == 90.0
    assert result["confidence"] == 0.7


def test_image_dimensions_correct_the_normalized_angle():
    result = analyze_landmarks(visible_pose(), image_size=(200, 100))

    assert result["status"] == "ok"
    assert result["value"] == pytest.approx(126.86989764584402)


def test_invalid_image_dimensions_return_invalid_capture():
    result = analyze_landmarks(visible_pose(), image_size=(200, 0))

    assert result["status"] == "invalid_capture"
    assert result["value"] is None


def image_bytes():
    with BytesIO() as stream:
        Image.new("RGBA", (2, 1), (201, 17, 31, 255)).save(stream, format="PNG")
        return stream.getvalue()


class FixtureDetector:
    """Replace only inference; real image decoding and result calculation remain."""

    def __init__(self, poses):
        self.poses = poses
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.closed = True

    def detect(self, image):
        assert image.mode == "RGB"
        assert image.size == (2, 1)
        assert image.getpixel((0, 0)) == (201, 17, 31)
        return SimpleNamespace(
            pose_landmarks=self.poses, pose_world_landmarks=[], segmentation_masks=None
        )


def test_adapter_decodes_rgb_and_calculates_projected_spread(tmp_path):
    model = tmp_path / "pose.task"
    model.write_bytes(b"fixture model; inference replaced")
    pose = [SimpleNamespace(**point, z=0.0, presence=0.9) for point in visible_pose()]
    detector = FixtureDetector([pose])
    analyzer = MediaPipePoseAnalyzer(
        model, detector_factory=lambda _: detector, image_factory=lambda rgb: rgb
    )

    result = analyzer.analyze(image_bytes())

    assert result["status"] == "ok"
    assert result["value"] == pytest.approx(126.86989764584402)
    assert result["confidence"] == 0.9
    assert detector.closed


def test_adapter_no_pose_has_no_invented_value(tmp_path):
    model = tmp_path / "pose.task"
    model.write_bytes(b"fixture model; inference replaced")
    detector = FixtureDetector([])
    analyzer = MediaPipePoseAnalyzer(
        model, detector_factory=lambda _: detector, image_factory=lambda rgb: rgb
    )

    result = analyzer.analyze(image_bytes())

    assert result["status"] == "invalid_capture"
    assert result["value"] is None
    assert result["confidence"] == 0.0
    assert result["reason"]
    assert detector.closed


def test_adapter_production_conversion_creates_real_mediapipe_srgb_image(tmp_path):
    mp = pytest.importorskip("mediapipe")
    model = tmp_path / "pose.task"
    model.write_bytes(b"fixture model; inference replaced")

    class ImageDetector(FixtureDetector):
        def detect(self, image):
            assert isinstance(image, mp.Image)
            assert image.image_format == mp.ImageFormat.SRGB
            assert (image.width, image.height) == (2, 1)
            assert image.numpy_view().tolist() == [[[201, 17, 31], [201, 17, 31]]]
            return SimpleNamespace(
                pose_landmarks=[], pose_world_landmarks=[], segmentation_masks=None
            )

    detector = ImageDetector([])
    analyzer = MediaPipePoseAnalyzer(model, detector_factory=lambda _: detector)

    result = analyzer.analyze(image_bytes())

    assert result["status"] == "invalid_capture"
    assert result["value"] is None
    assert detector.closed


def test_adapter_default_detector_uses_local_tasks_model_in_image_mode(tmp_path, monkeypatch):
    mp = pytest.importorskip("mediapipe")
    model = tmp_path / "pose.task"
    model.write_bytes(b"fixture model; inference replaced")
    detector = FixtureDetector([])

    def create_from_options(options):
        assert options.base_options.model_asset_path == str(model)
        assert options.running_mode == mp.tasks.vision.RunningMode.IMAGE
        assert options.num_poses == 1
        return detector

    monkeypatch.setattr(mp.tasks.vision.PoseLandmarker, "create_from_options", create_from_options)
    analyzer = MediaPipePoseAnalyzer(model, image_factory=lambda rgb: rgb)

    result = analyzer.analyze(image_bytes())

    assert result["status"] == "invalid_capture"
    assert result["value"] is None
    assert detector.closed


def test_adapter_invalid_image_raises_value_error_before_inference(tmp_path):
    analyzer = MediaPipePoseAnalyzer(tmp_path / "unused.task")

    with pytest.raises(ValueError, match="image"):
        analyzer.analyze(b"not an image")


def test_adapter_missing_local_model_is_unavailable(tmp_path):
    analyzer = MediaPipePoseAnalyzer(
        tmp_path / "missing.task",
        detector_factory=lambda _: FixtureDetector([]),
        image_factory=lambda rgb: rgb,
    )

    with pytest.raises(FileNotFoundError):
        analyzer.analyze(image_bytes())


def test_adapter_uninstalled_runtime_is_unavailable(tmp_path, monkeypatch):
    model = tmp_path / "pose.task"
    model.write_bytes(b"fixture model")
    original_import = builtins.__import__

    def without_mediapipe(name, *args, **kwargs):
        if name == "mediapipe":
            raise ModuleNotFoundError("No module named 'mediapipe'")
        return original_import(name, *args, **kwargs)

    monkeypatch.setattr(builtins, "__import__", without_mediapipe)

    with pytest.raises(RuntimeError, match="runtime"):
        MediaPipePoseAnalyzer(model).analyze(image_bytes())


def test_nonnumeric_required_coordinate_returns_invalid_capture():
    landmarks = visible_pose()
    landmarks[23]["x"] = "0.5"

    result = analyze_landmarks(landmarks)

    assert result["status"] == "invalid_capture"
    assert result["value"] is None


def test_nonnumeric_required_visibility_returns_invalid_capture():
    landmarks = visible_pose()
    landmarks[28]["visibility"] = None

    result = analyze_landmarks(landmarks)

    assert result["status"] == "invalid_capture"
    assert result["value"] is None


def test_nonfinite_visibility_threshold_cannot_allow_measurement():
    result = analyze_landmarks(visible_pose(), min_visibility=math.nan)

    assert result["status"] == "invalid_capture"
    assert result["value"] is None


def test_inference_failure_is_unavailable_and_closes_detector(tmp_path):
    model = tmp_path / "pose.task"
    model.write_bytes(b"fixture model")

    class FailingDetector(FixtureDetector):
        def detect(self, image):
            raise ValueError("native inference configuration failed")

    detector = FailingDetector([])
    analyzer = MediaPipePoseAnalyzer(
        model, detector_factory=lambda _: detector, image_factory=lambda rgb: rgb
    )

    with pytest.raises(RuntimeError):
        analyzer.analyze(image_bytes())
    assert detector.closed


def test_camera_decision_declares_actual_landmarks_and_reproduces_ninety_degree_geometry():
    import json

    result = analyze_landmarks(visible_pose())
    decision = result["decision"]
    points = [json.loads(entry["detail"]) for entry in decision["evidence"][:4]]
    assert [entry["id"] for entry in decision["evidence"][:4]] == [
        "landmark-23",
        "landmark-24",
        "landmark-27",
        "landmark-28",
    ]
    assert points == [visible_pose()[index] for index in (23, 24, 27, 28)]
    image = json.loads(decision["evidence"][4]["detail"])
    assert image["square_assumption"] is True
    assert image["width"] is None and image["height"] is None
    hip_x, hip_y = (points[0]["x"] + points[1]["x"]) / 2, (points[0]["y"] + points[1]["y"]) / 2
    left = ((points[2]["x"] - hip_x) * image["aspect_ratio"], points[2]["y"] - hip_y)
    right = ((points[3]["x"] - hip_x) * image["aspect_ratio"], points[3]["y"] - hip_y)
    calculated = math.degrees(
        math.acos(
            sum(a * b for a, b in zip(left, right)) / (math.hypot(*left) * math.hypot(*right))
        )
    )
    assert calculated == result["value"] == 90.0
    assert "hip midpoint" in decision["rule"]
    assert "model/version unavailable" in " ".join(decision["limitations"])


def test_camera_decision_reports_real_dimensions_and_invalid_capture_has_no_geometry():
    import json

    decision = analyze_landmarks(visible_pose(), image_size=(200, 100))["decision"]
    geometry = json.loads(decision["evidence"][4]["detail"])
    assert geometry == {
        "width": 200,
        "height": 100,
        "aspect_ratio": 2,
        "square_assumption": False,
        "visibility_threshold": 0.7,
    }
    assert "decision" not in analyze_landmarks([])
