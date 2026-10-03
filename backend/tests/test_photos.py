def test_retained_hand_photo_has_private_metadata_and_can_be_read(client, auth, image_bytes):
    saved = client.post(
        "/v1/me/photos",
        headers=auth,
        data={"upload_consent": "true", "retain_consent": "true", "side": "right", "view": "palm"},
        files={"file": ("hand.png", image_bytes, "image/png")},
    )
    assert saved.status_code == 201
    photo = saved.json()
    assert photo["side"] == "right"
    assert (photo["width"], photo["height"]) == (32, 24)
    assert client.get("/v1/me/photos", headers=auth).json() == [photo]
    downloaded = client.get(f"/v1/me/photos/{photo['id']}", headers=auth)
    assert downloaded.status_code == 200
    assert downloaded.headers["content-type"] == "image/jpeg"
    assert downloaded.content.startswith(b"\xff\xd8")


def test_hand_annotation_can_reference_only_an_owned_photo(client, auth, image_bytes):
    photo = client.post(
        "/v1/me/photos",
        headers=auth,
        data={"upload_consent": "true", "retain_consent": "true", "side": "right", "view": "palm"},
        files={"file": ("hand.png", image_bytes, "image/png")},
    ).json()
    payload = {"side": "right", "region": "ring_finger", "pain": 4, "photo_id": photo["id"]}
    response = client.post("/v1/me/hands", headers=auth, json=payload)
    assert response.status_code == 201
    assert response.json()["photo_id"] == photo["id"]
    other = client.post("/v1/climbers", json={"name": "Other"}).json()
    headers = {"Authorization": f"Bearer {other['token']}"}
    assert client.post("/v1/me/hands", headers=headers, json=payload).status_code == 404


def test_photo_deletion_removes_links_but_preserves_symptom_history(client, auth, image_bytes):
    photo = client.post(
        "/v1/me/photos",
        headers=auth,
        data={"upload_consent": "true", "retain_consent": "true", "side": "right", "view": "palm"},
        files={"file": ("hand.png", image_bytes, "image/png")},
    ).json()
    report = client.post(
        "/v1/me/hands",
        headers=auth,
        json={"side": "right", "region": "ring_finger", "pain": 4, "photo_id": photo["id"]},
    ).json()
    deleted = client.delete(f"/v1/me/photos/{photo['id']}", headers=auth)
    assert deleted.status_code == 204
    assert client.get(f"/v1/me/photos/{photo['id']}", headers=auth).status_code == 404
    remaining = client.get("/v1/me/hands", headers=auth).json()
    assert remaining[0]["id"] == report["id"]
    assert remaining[0]["pain"] == 4
    assert remaining[0]["photo_id"] is None


def test_annotation_rejects_photo_of_the_other_hand(client, auth, image_bytes):
    photo = client.post(
        "/v1/me/photos",
        headers=auth,
        data={"upload_consent": "true", "retain_consent": "true", "side": "right", "view": "palm"},
        files={"file": ("hand.png", image_bytes, "image/png")},
    ).json()
    response = client.post(
        "/v1/me/hands",
        headers=auth,
        json={"side": "left", "region": "ring_finger", "pain": 4, "photo_id": photo["id"]},
    )
    assert response.status_code == 422


def test_saved_photo_strips_location_and_other_exif_metadata(client, auth):
    from io import BytesIO

    from PIL import Image

    original = Image.new("RGB", (10, 10), "green")
    exif = original.getexif()
    exif[0x013B] = "private metadata"
    data = BytesIO()
    original.save(data, format="JPEG", exif=exif)
    photo = client.post(
        "/v1/me/photos",
        headers=auth,
        data={"upload_consent": "true", "retain_consent": "true", "side": "right", "view": "palm"},
        files={"file": ("hand.jpg", data.getvalue(), "image/jpeg")},
    ).json()
    response = client.get(f"/v1/me/photos/{photo['id']}", headers=auth)
    with Image.open(BytesIO(response.content)) as stored:
        assert len(stored.getexif()) == 0
