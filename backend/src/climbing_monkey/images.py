from io import BytesIO

from fastapi import HTTPException
from PIL import Image, ImageOps

MAX_IMAGE_BYTES = 8 * 1024 * 1024
MAX_IMAGE_PIXELS = 16_000_000


def read_image(file):
    data = file.file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image exceeds 8 MiB")
    try:
        with Image.open(BytesIO(data)) as image:
            if image.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValueError("Unsupported format")
            if image.width * image.height > MAX_IMAGE_PIXELS:
                raise HTTPException(413, "Image exceeds 16 million pixels")
            image.load()
            clean = ImageOps.exif_transpose(image).convert("RGB")
            output = BytesIO()
            clean.save(output, format="JPEG", quality=90)
            return output.getvalue(), clean.width, clean.height
    except (OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(400, "Supply a valid JPEG, PNG or WebP image") from None
