"""Transient VIDEO-mode pose analysis."""

import math
from contextlib import ExitStack, contextmanager
from io import BytesIO
from pathlib import Path
from time import monotonic

from PIL import Image, ImageOps

from .pose import _invalid, _mediapipe_image, analyze_landmarks, analyze_shoulder_landmarks

SAMPLE_INTERVAL_MS = 200
MAX_VIDEO_WIDTH = 1280
MAX_VIDEO_HEIGHT = 720
MAX_VIDEO_DURATION_MS = 60_000
MAX_DECODED_FRAMES = 1800
MAX_FRAME_BYTES = 8 * 1024 * 1024
MAX_FRAME_PIXELS = 16_000_000


def _check_size(width, height):
    if width <= 0 or height <= 0 or width * height > MAX_FRAME_PIXELS:
        raise ValueError("Video resolution exceeds 16 million pixels.")


def _video_detector(model_path):
    import mediapipe as mp

    options = mp.tasks.vision.PoseLandmarkerOptions(
        base_options=mp.tasks.BaseOptions(model_asset_path=str(model_path)),
        running_mode=mp.tasks.vision.RunningMode.VIDEO,
        num_poses=1,
    )
    return mp.tasks.vision.PoseLandmarker.create_from_options(options)


def _result(detected, size, metric="leg_spread"):
    landmarks = (
        [
            {"x": point.x, "y": point.y, "visibility": point.visibility}
            for point in detected.pose_landmarks[0]
        ]
        if detected.pose_landmarks
        else []
    )
    if not landmarks:
        result = _invalid("No pose was detected in the capture.", metric=metric)
    else:
        analyze = analyze_shoulder_landmarks if metric == "shoulder_reach" else analyze_landmarks
        result = analyze(landmarks, image_size=size)
    if any(
        type(value) not in (int, float) or not math.isfinite(value)
        for point in landmarks
        for value in point.values()
    ):
        landmarks = []
    return {
        **result,
        "landmarks": landmarks,
        "image_width": size[0],
        "image_height": size[1],
    }


def _camera_rgb(data):
    try:
        with Image.open(BytesIO(data)) as source:
            if source.width * source.height > MAX_FRAME_PIXELS:
                raise ValueError("Camera frame resolution exceeds 16 million pixels.")
            if source.format != "JPEG":
                raise ValueError("Supply a JPEG camera frame.")
            with ImageOps.exif_transpose(source) as oriented:
                rgb = oriented.convert("RGB")
                rgb.thumbnail((MAX_VIDEO_WIDTH, MAX_VIDEO_HEIGHT))
                return rgb
    except (OSError, Image.DecompressionBombError) as exc:
        raise ValueError("Supply a valid JPEG camera frame.") from exc


def _deny_external_io(url, flags, options):
    raise ValueError("External video resources are not permitted.")


@contextmanager
def _open_video(av, path):
    with Path(path).open("rb") as source:
        header = source.read(4096)
        source.seek(0)
        if header[4:8] == b"ftyp":
            format_name = "mov"
        elif header[:4] == b"\x1a\x45\xdf\xa3" and b"\x42\x82\x84webm" in header:
            format_name = "matroska"
        else:
            raise ValueError(
                "Unsupported video container; supply a self-contained MP4, MOV or WebM."
            )
        with av.open(
            source, format=format_name, io_open=_deny_external_io, options={"enable_drefs": "0"}
        ) as container:
            yield container


class MediaPipeVideoAnalyzer:
    """Decode bounded clips or open transient camera tracking sessions.

    One local Tasks VIDEO detector lives for each context. The injectable
    factories replace inference in tests while real decoding and geometry run.
    Capture errors raise ValueError; optional runtime/model errors raise
    RuntimeError or OSError. Neither path persists frames or measurements.
    """

    def __init__(self, model_path, *, detector_factory=None, image_factory=None):
        self.model_path = model_path
        self.detector_factory = detector_factory or _video_detector
        self.image_factory = image_factory or _mediapipe_image

    @contextmanager
    def session(self, metric="leg_spread"):
        if not Path(self.model_path).is_file():
            raise FileNotFoundError("The configured pose model is unavailable.")
        with ExitStack() as stack:
            try:
                detector = stack.enter_context(self.detector_factory(self.model_path))
            except (ImportError, ValueError) as exc:
                raise RuntimeError("The pose runtime or model could not run.") from exc
            yield VideoSession(detector, self.image_factory, metric=metric)

    def analyze(self, path):
        try:
            import av
        except ImportError as exc:
            raise RuntimeError("The optional video runtime is unavailable.") from exc

        frames = []
        next_sample = 0
        with _open_video(av, path) as container:
            if not container.streams.video:
                raise ValueError("The capture contains no video stream.")
            stream = container.streams.video[0]
            _check_size(stream.width, stream.height)
            duration_ms = (
                round(stream.duration * stream.time_base * 1000)
                if stream.duration is not None
                else round((container.duration or 0) / 1000)
            )
            if duration_ms > MAX_VIDEO_DURATION_MS:
                raise ValueError("Video duration exceeds 60 seconds.")
            with self.session() as session:
                for count, frame in enumerate(container.decode(stream), 1):
                    if count > MAX_DECODED_FRAMES:
                        raise ValueError("Video frame count exceeds 1800.")
                    _check_size(frame.width, frame.height)
                    if (
                        type(frame.time) not in (int, float)
                        or not math.isfinite(frame.time)
                        or frame.time < 0
                    ):
                        raise ValueError(
                            "Video frames require finite nonnegative presentation timestamps."
                        )
                    timestamp = round(frame.time * 1000)
                    frame_duration = round(frame.duration * frame.time_base * 1000)
                    duration_ms = max(duration_ms, timestamp + frame_duration)
                    if duration_ms > MAX_VIDEO_DURATION_MS:
                        raise ValueError("Video duration exceeds 60 seconds.")
                    if timestamp < next_sample:
                        continue
                    with (
                        frame.to_image() as decoded,
                        decoded.rotate(frame.rotation, expand=True) as rgb,
                    ):
                        rgb.thumbnail((MAX_VIDEO_WIDTH, MAX_VIDEO_HEIGHT))
                        frames.append(
                            {"timestamp_ms": timestamp, **session.analyze_rgb(rgb, timestamp)}
                        )
                    next_sample = timestamp + SAMPLE_INTERVAL_MS
        return {
            "frames": frames,
            "duration_ms": duration_ms,
            "sampled_frame_count": len(frames),
            "valid_frame_count": sum(frame["status"] == "ok" for frame in frames),
        }


class VideoSession:
    def __init__(self, detector, image_factory, *, metric="leg_spread"):
        self.metric = metric
        self.detector = detector
        self.image_factory = image_factory
        self.last_timestamp = -1
        self.first_timestamp = None
        self.frame_count = 0
        self.started_at = monotonic()

    def analyze_frame(self, data, timestamp_ms):
        if len(data) > MAX_FRAME_BYTES:
            raise ValueError("Encoded frame size exceeds 8 MiB.")
        with _camera_rgb(data) as rgb:
            return self.analyze_rgb(rgb, timestamp_ms)

    def analyze_rgb(self, rgb, timestamp_ms):
        if (monotonic() - self.started_at) * 1000 > MAX_VIDEO_DURATION_MS:
            raise ValueError("Live session duration exceeds 60 seconds; start a new session.")
        if self.frame_count >= MAX_DECODED_FRAMES:
            raise ValueError("Live frame count exceeds 1800; start a new session.")
        if type(timestamp_ms) is not int or not self.last_timestamp < timestamp_ms < 2**53:
            raise ValueError("Frame timestamp must be a nonnegative increasing integer.")
        if self.first_timestamp is None:
            self.first_timestamp = timestamp_ms
        if timestamp_ms - self.first_timestamp > MAX_VIDEO_DURATION_MS:
            raise ValueError("Live session duration exceeds 60 seconds; start a new session.")
        self.last_timestamp = timestamp_ms
        self.frame_count += 1
        try:
            detected = self.detector.detect_for_video(self.image_factory(rgb), timestamp_ms)
        except (ImportError, ValueError) as exc:
            raise RuntimeError("The pose runtime or model could not run.") from exc
        return _result(detected, rgb.size, self.metric)
