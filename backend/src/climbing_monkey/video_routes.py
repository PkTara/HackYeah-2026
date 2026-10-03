import asyncio
import json
import os
from tempfile import NamedTemporaryFile

from fastapi import Depends, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPAuthorizationCredentials
from starlette.concurrency import run_in_threadpool

from .video import MAX_FRAME_BYTES, MAX_VIDEO_DURATION_MS, MediaPipeVideoAnalyzer

MAX_VIDEO_BYTES = 32 * 1024 * 1024
MESSAGE_TIMEOUT_SECONDS = 10


async def _receive_json(socket):
    message = await _receive_message(socket)
    if "text" not in message:
        raise ValueError("Supply a JSON text message.")
    if len(message["text"].encode("utf-8")) > 1024:
        raise ValueError("Control message exceeds 1024 bytes.")
    payload = json.loads(message["text"])
    if not isinstance(payload, dict):
        raise ValueError("Supply a JSON object message.")
    return payload


async def _receive_message(socket):
    message = await asyncio.wait_for(socket.receive(), timeout=MESSAGE_TIMEOUT_SECONDS)
    if message["type"] == "websocket.disconnect":
        raise WebSocketDisconnect(message.get("code", 1000))
    return message


def _configured(analyzer):
    if analyzer is not None:
        return analyzer
    path = os.environ.get("POSE_MODEL_PATH")
    if not path:
        raise RuntimeError("Pose analyzer is not configured")
    return MediaPipeVideoAnalyzer(path)


def _analyze_upload(file, analyzer):
    with NamedTemporaryFile() as capture:
        total = 0
        while chunk := file.file.read(min(1024 * 1024, MAX_VIDEO_BYTES + 1 - total)):
            total += len(chunk)
            if total > MAX_VIDEO_BYTES:
                raise HTTPException(413, "Video exceeds 32 MiB")
            capture.write(chunk)
        capture.flush()
        return analyzer.analyze(capture.name)


def register_video(app, current_user, video_analyzer):
    @app.websocket("/v1/pose/stream")
    async def stream(socket: WebSocket):
        await socket.accept()
        try:
            handshake = await _receive_json(socket)
            if handshake.get("type") != "start" or handshake.get("upload_consent") is not True:
                raise ValueError("Explicit upload consent is required")
            token = handshake.get("token")
            if not isinstance(token, str) or not 1 <= len(token) <= 256:
                raise ValueError("Invalid or missing bearer token")
            credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
            await run_in_threadpool(current_user, credentials)
            context = _configured(video_analyzer).session()
            session = await run_in_threadpool(context.__enter__)
            try:
                await socket.send_json(
                    {
                        "type": "ready",
                        "max_frame_bytes": MAX_FRAME_BYTES,
                        "max_duration_ms": MAX_VIDEO_DURATION_MS,
                    }
                )
                while True:
                    message = await _receive_json(socket)
                    if message.get("type") == "stop":
                        await socket.close(code=1000)
                        return
                    timestamp = message.get("timestamp_ms")
                    if (
                        message.get("type") != "frame"
                        or type(timestamp) is not int
                        or timestamp < 0
                    ):
                        raise ValueError(
                            "Supply a frame message with a nonnegative integer timestamp."
                        )
                    frame = await _receive_message(socket)
                    if "bytes" not in frame:
                        raise ValueError("Supply binary JPEG bytes after the frame message.")
                    data = frame["bytes"]
                    await run_in_threadpool(current_user, credentials)
                    result = await run_in_threadpool(session.analyze_frame, data, timestamp)
                    await socket.send_json({"type": "result", "timestamp_ms": timestamp, **result})
            finally:
                await run_in_threadpool(context.__exit__, None, None, None)
        except WebSocketDisconnect:
            pass
        except (ValueError, HTTPException, TimeoutError) as exc:
            detail = (
                "Live message timed out"
                if isinstance(exc, TimeoutError)
                else exc.detail
                if isinstance(exc, HTTPException)
                else str(exc)
            )
            await socket.send_json({"type": "error", "detail": detail})
            await socket.close(code=1008)
        except (RuntimeError, OSError):
            await socket.send_json(
                {"type": "error", "detail": "Pose runtime or model is unavailable"}
            )
            await socket.close(code=1011)

    @app.post("/v1/pose/video")
    async def video(
        file: UploadFile, upload_consent: bool = Form(False), user: dict = Depends(current_user)
    ):
        if not upload_consent:
            raise HTTPException(403, "Explicit upload consent is required")
        try:
            return await run_in_threadpool(_analyze_upload, file, _configured(video_analyzer))
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from None
        except (RuntimeError, OSError):
            raise HTTPException(503, "Pose runtime or model is unavailable") from None
