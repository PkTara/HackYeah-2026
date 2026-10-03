import pytest
from fastapi.testclient import TestClient

from climbing_monkey.main import create_app


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(database_path=tmp_path / "test.sqlite3")) as client:
        yield client


@pytest.fixture
def auth(client):
    response = client.post("/v1/climbers", json={"name": "Monkey", "goal": "technique"})
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['token']}"}


@pytest.fixture
def image_bytes():
    from io import BytesIO

    from PIL import Image

    data = BytesIO()
    Image.new("RGB", (32, 24), "green").save(data, format="PNG")
    return data.getvalue()
