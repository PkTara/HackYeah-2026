from uuid import uuid4

from fastapi import Depends, HTTPException, Response


def register_records(app, store, current_user, kind, schema):
    def create_record(payload: schema, user: dict = Depends(current_user)):
        record = {"id": str(uuid4()), **payload.model_dump(mode="json")}
        try:
            return store.add_record(user["id"], kind, record)
        except KeyError:
            raise HTTPException(404, "Photo not found") from None
        except ValueError as error:
            raise HTTPException(422, str(error)) from None

    def list_records(user: dict = Depends(current_user)):
        return store.records(user["id"], kind)

    def delete_record(record_id: str, user: dict = Depends(current_user)):
        if not store.delete_record(user["id"], kind, record_id):
            raise HTTPException(404, "Record not found")
        return Response(status_code=204)

    app.add_api_route(
        f"/v1/me/{kind}", create_record, methods=["POST"], status_code=201, name=f"create_{kind}"
    )
    app.add_api_route(f"/v1/me/{kind}", list_records, methods=["GET"], name=f"list_{kind}")
    app.add_api_route(
        f"/v1/me/{kind}/{{record_id}}",
        delete_record,
        methods=["DELETE"],
        status_code=204,
        name=f"delete_{kind}",
    )
