from ..database.firestore import db
from ..models.data import (
    DataCreate,
    DataResponse,
    DataUpdate,
)

COLLECTION_NAME = "data"


def create_data(payload: DataCreate) -> DataResponse:
    document_data = payload.model_dump(mode="json")

    document_reference = (
        db.collection(COLLECTION_NAME).document()
    )
    document_reference.set(document_data)

    return DataResponse(
        id=document_reference.id,
        **document_data,
    )


def get_data_list() -> list[DataResponse]:
    documents = db.collection(COLLECTION_NAME).stream()
    records = []

    for document in documents:
        document_data = document.to_dict()

        if document_data is None:
            continue

        records.append(
            DataResponse(
                id=document.id,
                **document_data,
            )
        )

    return sorted(
        records,
        key=lambda record: record.date,
        reverse=True,
    )


def update_data(
    data_id: str,
    payload: DataUpdate,
) -> DataResponse | None:
    document_reference = (
        db.collection(COLLECTION_NAME).document(data_id)
    )
    snapshot = document_reference.get()

    if not snapshot.exists:
        return None

    document_data = payload.model_dump(mode="json")
    document_reference.set(document_data)

    return DataResponse(
        id=data_id,
        **document_data,
    )


def delete_data(data_id: str) -> bool:
    document_reference = (
        db.collection(COLLECTION_NAME).document(data_id)
    )
    snapshot = document_reference.get()

    if not snapshot.exists:
        return False

    document_reference.delete()
    return True