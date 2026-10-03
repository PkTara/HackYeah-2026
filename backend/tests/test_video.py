from io import BytesIO
from types import SimpleNamespace

import pytest
from PIL import Image

from climbing_monkey.video import MediaPipeVideoAnalyzer


def encoded_clip(*, width=64, height=48, frame_count=5, rate=10):
    av = pytest.importorskip("av")
    data = BytesIO()
    with av.open(data, "w", format="mp4") as container:
        stream = container.add_stream("mpeg4", rate=rate)
        stream.width, stream.height, stream.pix_fmt = width, height, "yuv420p"
        for _ in range(frame_count):
            frame = av.VideoFrame.from_image(Image.new("RGB", (width, height), "green"))
            for packet in stream.encode(frame):
                container.mux(packet)
        for packet in stream.encode():
            container.mux(packet)
    return data.getvalue()


class Detector:
    def __init__(self):
        self.timestamps = []
        self.closed = False

    def __enter__(self):
        return self

    def __exit__(self, *_):
        self.closed = True

    def detect_for_video(self, image, timestamp_ms):
        assert image.mode == "RGB"
        assert image.size == (64, 48)
        self.timestamps.append(timestamp_ms)
        pose = [SimpleNamespace(x=0.5, y=0.25, visibility=0.9) for _ in range(33)]
        pose[27] = SimpleNamespace(x=0.25, y=0.5, visibility=0.9)
        pose[28] = SimpleNamespace(x=0.75, y=0.5, visibility=0.9)
        return SimpleNamespace(pose_landmarks=[pose])


def analyzer_fixture(tmp_path, detector=None):
    model = tmp_path / "pose.task"
    model.write_bytes(b"inference fixture")
    detector = detector or Detector()
    return MediaPipeVideoAnalyzer(
        model, detector_factory=lambda _: detector, image_factory=lambda rgb: rgb
    ), detector


def test_real_clip_samples_timestamped_results_with_one_closed_detector(tmp_path):
    analyzer, detector = analyzer_fixture(tmp_path)
    clip = tmp_path / "capture.mp4"
    clip.write_bytes(encoded_clip())

    result = analyzer.analyze(clip)

    assert detector.timestamps == [0, 200, 400]
    assert [frame["timestamp_ms"] for frame in result["frames"]] == [0, 200, 400]
    assert result["sampled_frame_count"] == result["valid_frame_count"] == 3
    assert result["duration_ms"] == 500
    assert result["frames"][0]["value"] == pytest.approx(106.26020470831197)
    assert detector.closed


def test_default_detector_uses_tasks_video_mode(tmp_path, monkeypatch):
    mp = pytest.importorskip("mediapipe")
    model = tmp_path / "pose.task"
    model.write_bytes(b"inference fixture")
    clip = tmp_path / "capture.mp4"
    clip.write_bytes(encoded_clip())
    detector = Detector()

    def create(options):
        assert options.base_options.model_asset_path == str(model)
        assert options.running_mode == mp.tasks.vision.RunningMode.VIDEO
        assert options.num_poses == 1
        return detector

    monkeypatch.setattr(mp.tasks.vision.PoseLandmarker, "create_from_options", create)
    analyzer = MediaPipeVideoAnalyzer(model, image_factory=lambda rgb: rgb)

    assert analyzer.analyze(clip)["sampled_frame_count"] == 3
    assert detector.closed


def test_bad_video_is_rejected_before_creating_detector(tmp_path):
    pytest.importorskip("av")
    analyzer, detector = analyzer_fixture(tmp_path)
    clip = tmp_path / "bad.mp4"
    clip.write_bytes(b"not a video")

    with pytest.raises(ValueError, match="video"):
        analyzer.analyze(clip)
    assert not detector.timestamps


def test_excessive_resolution_rejected_before_inference(tmp_path):
    analyzer, detector = analyzer_fixture(tmp_path)
    clip = tmp_path / "wide.mp4"
    clip.write_bytes(encoded_clip(width=4002, height=4000, frame_count=1))

    with pytest.raises(ValueError, match="resolution"):
        analyzer.analyze(clip)
    assert not detector.timestamps


def test_excessive_duration_rejected_before_inference(tmp_path):
    analyzer, detector = analyzer_fixture(tmp_path)
    clip = tmp_path / "long.mp4"
    clip.write_bytes(encoded_clip(frame_count=61, rate=1))

    with pytest.raises(ValueError, match="duration"):
        analyzer.analyze(clip)
    assert not detector.timestamps


def test_excessive_decoded_frame_count_rejected_and_detector_closed(tmp_path, monkeypatch):
    import climbing_monkey.video as video

    monkeypatch.setattr(video, "MAX_DECODED_FRAMES", 4, raising=False)
    analyzer, detector = analyzer_fixture(tmp_path)
    clip = tmp_path / "dense.mp4"
    clip.write_bytes(encoded_clip())

    with pytest.raises(ValueError, match="frame count"):
        analyzer.analyze(clip)
    assert detector.closed


def test_native_inference_error_is_runtime_error_and_closes_detector(tmp_path):
    class BrokenDetector(Detector):
        def detect_for_video(self, image, timestamp_ms):
            raise ValueError("invalid native configuration")

    analyzer, detector = analyzer_fixture(tmp_path, BrokenDetector())
    clip = tmp_path / "capture.mp4"
    clip.write_bytes(encoded_clip())

    with pytest.raises(RuntimeError, match="runtime"):
        analyzer.analyze(clip)
    assert detector.closed


def test_live_session_reuses_one_detector_for_ordered_real_jpeg_frames(tmp_path):
    analyzer, detector = analyzer_fixture(tmp_path)
    data = BytesIO()
    Image.new("RGB", (64, 48), "green").save(data, format="JPEG")

    with analyzer.session() as session:
        first = session.analyze_frame(data.getvalue(), 100)
        second = session.analyze_frame(data.getvalue(), 300)

    assert first["status"] == second["status"] == "ok"
    assert detector.timestamps == [100, 300]
    assert detector.closed


def test_live_session_rejects_duplicate_timestamp_before_inference(tmp_path):
    analyzer, detector = analyzer_fixture(tmp_path)
    data = BytesIO()
    Image.new("RGB", (64, 48), "green").save(data, format="JPEG")

    with analyzer.session() as session:
        session.analyze_frame(data.getvalue(), 100)
        with pytest.raises(ValueError, match="timestamp"):
            session.analyze_frame(data.getvalue(), 100)

    assert detector.timestamps == [100]
    assert detector.closed


def test_live_session_rejects_excessive_encoded_frame_bytes(tmp_path, monkeypatch):
    import climbing_monkey.video as video

    monkeypatch.setattr(video, "MAX_FRAME_BYTES", 32, raising=False)
    analyzer, detector = analyzer_fixture(tmp_path)
    data = BytesIO()
    Image.new("RGB", (64, 48), "green").save(data, format="JPEG")

    with analyzer.session() as session, pytest.raises(ValueError, match="frame size"):
        session.analyze_frame(data.getvalue(), 100)
    assert not detector.timestamps
    assert detector.closed


def test_live_session_rejects_png_instead_of_jpeg(tmp_path):
    analyzer, detector = analyzer_fixture(tmp_path)
    data = BytesIO()
    Image.new("RGB", (64, 48), "green").save(data, format="PNG")

    with analyzer.session() as session, pytest.raises(ValueError, match="JPEG"):
        session.analyze_frame(data.getvalue(), 100)
    assert not detector.timestamps
    assert detector.closed


def test_live_session_rejects_excessive_resolution_before_inference(tmp_path):
    analyzer, detector = analyzer_fixture(tmp_path)
    data = BytesIO()
    Image.new("RGB", (4001, 4000), "green").save(data, format="JPEG")

    with analyzer.session() as session, pytest.raises(ValueError, match="resolution"):
        session.analyze_frame(data.getvalue(), 100)
    assert not detector.timestamps
    assert detector.closed


def test_live_session_duration_is_bounded_relative_to_first_timestamp(tmp_path):
    analyzer, detector = analyzer_fixture(tmp_path)
    data = BytesIO()
    Image.new("RGB", (64, 48), "green").save(data, format="JPEG")

    with analyzer.session() as session:
        session.analyze_frame(data.getvalue(), 900_000)
        with pytest.raises(ValueError, match="duration"):
            session.analyze_frame(data.getvalue(), 960_001)
    assert detector.timestamps == [900_000]
    assert detector.closed


def test_live_native_error_is_runtime_error_with_closed_detector(tmp_path):
    class BrokenDetector(Detector):
        def detect_for_video(self, image, timestamp_ms):
            raise ValueError("invalid native configuration")

    analyzer, detector = analyzer_fixture(tmp_path, BrokenDetector())
    data = BytesIO()
    Image.new("RGB", (64, 48), "green").save(data, format="JPEG")

    with pytest.raises(RuntimeError, match="runtime"), analyzer.session() as session:
        session.analyze_frame(data.getvalue(), 100)
    assert detector.closed


def test_missing_model_is_unavailable_before_session_inference(tmp_path):
    detector = Detector()
    analyzer = MediaPipeVideoAnalyzer(
        tmp_path / "missing.task",
        detector_factory=lambda _: detector,
        image_factory=lambda rgb: rgb,
    )

    with pytest.raises(FileNotFoundError), analyzer.session():
        pass


def test_unavailable_native_session_creation_is_runtime_error(tmp_path):
    model = tmp_path / "pose.task"
    model.write_bytes(b"inference fixture")

    def unavailable(_):
        raise ValueError("bad native model configuration")

    analyzer = MediaPipeVideoAnalyzer(model, detector_factory=unavailable)
    with pytest.raises(RuntimeError, match="runtime"), analyzer.session():
        pass


def test_live_camera_frame_orients_and_downsamples_before_inference(tmp_path):
    class SnapshotDetector(Detector):
        def detect_for_video(self, image, timestamp_ms):
            assert image.size == (540, 720)
            assert image.mode == "RGB"
            self.timestamps.append(timestamp_ms)
            return SimpleNamespace(pose_landmarks=[])

    analyzer, detector = analyzer_fixture(tmp_path, SnapshotDetector())
    data = BytesIO()
    exif = Image.Exif()
    exif[274] = 6
    Image.new("RGB", (2048, 1536), "green").save(data, format="JPEG", exif=exif)
    with analyzer.session() as session:
        result = session.analyze_frame(data.getvalue(), 100)
    assert result["status"] == "invalid_capture"
    assert detector.timestamps == [100]
    assert detector.closed


def test_live_camera_accepts_jpeg_up_to_eight_mib(tmp_path):
    analyzer, detector = analyzer_fixture(tmp_path)
    data = BytesIO()
    Image.new("RGB", (64, 48), "green").save(data, format="JPEG")
    padded_jpeg = data.getvalue() + b"\0" * (3 * 1024 * 1024)
    with analyzer.session() as session:
        assert session.analyze_frame(padded_jpeg, 100)["status"] == "ok"
    assert detector.closed


def test_live_frame_count_limit_closes_detector(tmp_path, monkeypatch):
    import climbing_monkey.video as video

    monkeypatch.setattr(video, "MAX_DECODED_FRAMES", 1)
    analyzer, detector = analyzer_fixture(tmp_path)
    data = BytesIO()
    Image.new("RGB", (64, 48), "green").save(data, format="JPEG")
    with analyzer.session() as session:
        session.analyze_frame(data.getvalue(), 100)
        with pytest.raises(ValueError, match="frame count"):
            session.analyze_frame(data.getvalue(), 200)
    assert detector.timestamps == [100]
    assert detector.closed


def test_webm_clip_without_stream_duration_metadata_is_decoded(tmp_path):
    av = pytest.importorskip("av")
    data = BytesIO()
    with av.open(data, "w", format="webm") as container:
        stream = container.add_stream("libvpx", rate=10)
        stream.width, stream.height, stream.pix_fmt = 64, 48, "yuv420p"
        for _ in range(5):
            frame = av.VideoFrame.from_image(Image.new("RGB", (64, 48), "green"))
            for packet in stream.encode(frame):
                container.mux(packet)
        for packet in stream.encode():
            container.mux(packet)
    clip = tmp_path / "capture.webm"
    clip.write_bytes(data.getvalue())
    analyzer, detector = analyzer_fixture(tmp_path)

    result = analyzer.analyze(clip)

    assert result["sampled_frame_count"] == 3
    assert result["duration_ms"] == 500
    assert detector.timestamps == [0, 200, 400]
    assert detector.closed


def test_audio_only_file_is_not_a_video_capture(tmp_path):
    pytest.importorskip("av")
    import wave

    clip = tmp_path / "audio.wav"
    with wave.open(str(clip), "wb") as output:
        output.setnchannels(1)
        output.setsampwidth(2)
        output.setframerate(8000)
        output.writeframes(b"\0\0" * 800)
    analyzer, detector = analyzer_fixture(tmp_path)

    with pytest.raises(ValueError, match="video"):
        analyzer.analyze(clip)
    assert not detector.timestamps


def test_streaming_webm_without_duration_metadata_reports_actual_duration(tmp_path):
    av = pytest.importorskip("av")
    data = BytesIO()
    with av.open(data, "w", format="webm", options={"live": "1"}) as container:
        stream = container.add_stream("libvpx", rate=10)
        stream.width, stream.height, stream.pix_fmt = 64, 48, "yuv420p"
        for _ in range(5):
            frame = av.VideoFrame.from_image(Image.new("RGB", (64, 48), "green"))
            for packet in stream.encode(frame):
                container.mux(packet)
        for packet in stream.encode():
            container.mux(packet)
    clip = tmp_path / "capture.webm"
    clip.write_bytes(data.getvalue())
    analyzer, detector = analyzer_fixture(tmp_path)
    result = analyzer.analyze(clip)
    assert result["duration_ms"] == 500
    assert result["sampled_frame_count"] == 3
    assert detector.closed


def test_absent_video_decoder_is_runtime_unavailable(tmp_path, monkeypatch):
    import builtins

    original = builtins.__import__

    def without_av(name, *args, **kwargs):
        if name == "av":
            raise ModuleNotFoundError("av is unavailable")
        return original(name, *args, **kwargs)

    analyzer, _ = analyzer_fixture(tmp_path)
    monkeypatch.setattr(builtins, "__import__", without_av)
    with pytest.raises(RuntimeError, match="runtime"):
        analyzer.analyze(tmp_path / "capture.mp4")


def test_live_wall_clock_duration_cannot_be_bypassed_with_timestamps(tmp_path, monkeypatch):
    import climbing_monkey.video as video

    clock = iter([0, 0, 61])
    monkeypatch.setattr(video, "monotonic", lambda: next(clock), raising=False)
    analyzer, detector = analyzer_fixture(tmp_path)
    data = BytesIO()
    Image.new("RGB", (64, 48), "green").save(data, format="JPEG")
    with analyzer.session() as session:
        session.analyze_frame(data.getvalue(), 100)
        with pytest.raises(ValueError, match="duration"):
            session.analyze_frame(data.getvalue(), 101)
    assert detector.timestamps == [100]
    assert detector.closed


def test_concat_manifest_cannot_read_a_sibling_server_video(tmp_path, monkeypatch):
    pytest.importorskip("av")
    private = tmp_path / "private.mp4"
    private.write_bytes(encoded_clip())
    manifest = tmp_path / "upload"
    manifest.write_text("ffconcat version 1.0\nfile private.mp4\n")
    analyzer, detector = analyzer_fixture(tmp_path)

    def forbidden_demux(*args, **kwargs):
        raise AssertionError("An uploaded manifest must never reach FFmpeg.")

    monkeypatch.setattr(__import__("av"), "open", forbidden_demux)
    with pytest.raises(ValueError, match="container"):
        analyzer.analyze(manifest)
    assert not detector.timestamps
    assert not detector.closed


def test_elementary_h264_is_rejected_as_unsupported_container(tmp_path):
    av = pytest.importorskip("av")
    clip = tmp_path / "elementary.h264"
    with av.open(str(clip), "w", format="h264") as output:
        stream = output.add_stream("libx264", rate=10)
        stream.width, stream.height, stream.pix_fmt = 64, 48, "yuv420p"
        for _ in range(5):
            for packet in stream.encode(av.VideoFrame.from_image(Image.new("RGB", (64, 48)))):
                output.mux(packet)
        for packet in stream.encode():
            output.mux(packet)
    analyzer, detector = analyzer_fixture(tmp_path)
    with pytest.raises(ValueError, match="container"):
        analyzer.analyze(clip)
    assert not detector.closed


@pytest.mark.parametrize("frame_time", [None, float("nan"), float("inf"), -1.0])
def test_missing_decoded_timestamp_is_capture_error_and_closes_detector(
    tmp_path, monkeypatch, frame_time
):
    av = pytest.importorskip("av")
    analyzer, detector = analyzer_fixture(tmp_path)
    clip = tmp_path / "capture.mp4"
    clip.write_bytes(encoded_clip())
    actual_open = av.open

    class MissingTimestamp:
        def __init__(self, container):
            self.container = container

        def __getattr__(self, name):
            return getattr(self.container, name)

        def __enter__(self):
            self.container.__enter__()
            return self

        def __exit__(self, *args):
            return self.container.__exit__(*args)

        def decode(self, stream):
            for frame in self.container.decode(stream):
                yield SimpleNamespace(width=frame.width, height=frame.height, time=frame_time)

    monkeypatch.setattr(
        av, "open", lambda *args, **kwargs: MissingTimestamp(actual_open(*args, **kwargs))
    )
    with pytest.raises(ValueError, match="timestamp"):
        analyzer.analyze(clip)
    assert detector.closed
    assert not detector.timestamps


def test_native_1080p_video_is_downsampled_before_inference(tmp_path):
    class NativeDetector(Detector):
        def detect_for_video(self, image, timestamp_ms):
            assert image.size == (1280, 720)
            self.timestamps.append(timestamp_ms)
            return SimpleNamespace(pose_landmarks=[])

    analyzer, detector = analyzer_fixture(tmp_path, NativeDetector())
    clip = tmp_path / "native.mp4"
    clip.write_bytes(encoded_clip(width=1920, height=1080, frame_count=1))
    result = analyzer.analyze(clip)
    assert result["sampled_frame_count"] == 1
    assert result["frames"][0]["status"] == "invalid_capture"
    assert detector.timestamps == [0]
    assert detector.closed


def test_portrait_mp4_display_rotation_is_applied_before_inference(tmp_path):
    import struct

    av = pytest.importorskip("av")

    class PortraitDetector(Detector):
        def detect_for_video(self, image, timestamp_ms):
            assert image.size == (48, 64)
            self.timestamps.append(timestamp_ms)
            return SimpleNamespace(pose_landmarks=[])

    data = bytearray(encoded_clip(frame_count=1))
    # Actual MP4 tkhd display matrix: counterclockwise 90-degree rotation.
    tkhd = data.index(b"tkhd")
    assert data[tkhd + 4] == 0  # Version zero track header.
    data[tkhd + 44 : tkhd + 80] = struct.pack(">9i", 0, -65536, 0, 65536, 0, 0, 0, 0, 1 << 30)
    clip = tmp_path / "portrait.mp4"
    clip.write_bytes(data)
    with av.open(str(clip)) as container:
        assert next(container.decode(video=0)).rotation == 90
    analyzer, detector = analyzer_fixture(tmp_path, PortraitDetector())

    assert analyzer.analyze(clip)["sampled_frame_count"] == 1
    assert detector.closed


def test_native_h264_mov_container_is_supported(tmp_path):
    av = pytest.importorskip("av")
    clip = tmp_path / "native.mov"
    with av.open(str(clip), "w", format="mov") as output:
        stream = output.add_stream("libx264", rate=10)
        stream.width, stream.height, stream.pix_fmt = 64, 48, "yuv420p"
        for _ in range(5):
            for packet in stream.encode(av.VideoFrame.from_image(Image.new("RGB", (64, 48)))):
                output.mux(packet)
        for packet in stream.encode():
            output.mux(packet)
    analyzer, detector = analyzer_fixture(tmp_path)
    result = analyzer.analyze(clip)
    assert result["sampled_frame_count"] == 3
    assert detector.timestamps == [0, 200, 400]
    assert detector.closed
