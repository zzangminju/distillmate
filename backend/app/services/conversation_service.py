from datetime import datetime, timezone

from ..database.firestore import db
from ..models.conversation import (
    ConversationCreate,
    ConversationResponse,
    Message,
)

COLLECTION_NAME = "conversations"


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


def create_conversation(
    payload: ConversationCreate,
) -> ConversationResponse:
    current_time = utc_now_iso()

    document_data = {
        "title": payload.title,
        "messages": [
            message.model_dump(mode="json")
            for message in payload.messages
        ],
        "created_at": current_time,
        "updated_at": current_time,
    }

    document_reference = (
        db.collection(COLLECTION_NAME).document()
    )
    document_reference.set(document_data)

    return ConversationResponse(
        id=document_reference.id,
        **document_data,
    )


def get_conversation_list() -> list[ConversationResponse]:
    documents = db.collection(COLLECTION_NAME).stream()
    conversations = []

    for document in documents:
        document_data = document.to_dict()

        if document_data is None:
            continue

        conversations.append(
            ConversationResponse(
                id=document.id,
                **document_data,
            )
        )

    return sorted(
        conversations,
        key=lambda conversation: conversation.updated_at,
        reverse=True,
    )


def get_conversation(
    conversation_id: str,
) -> ConversationResponse | None:
    document_reference = (
        db.collection(COLLECTION_NAME)
        .document(conversation_id)
    )
    snapshot = document_reference.get()

    if not snapshot.exists:
        return None

    document_data = snapshot.to_dict()

    if document_data is None:
        return None

    return ConversationResponse(
        id=snapshot.id,
        **document_data,
    )


def append_messages(
    conversation_id: str,
    new_messages: list[Message],
) -> ConversationResponse | None:
    conversation = get_conversation(conversation_id)

    if conversation is None:
        return None

    all_messages = [
        message.model_dump(mode="json")
        for message in conversation.messages
    ]

    all_messages.extend(
        message.model_dump(mode="json")
        for message in new_messages
    )

    updated_time = utc_now_iso()

    document_reference = (
        db.collection(COLLECTION_NAME)
        .document(conversation_id)
    )

    document_reference.update(
        {
            "messages": all_messages,
            "updated_at": updated_time,
        }
    )

    return get_conversation(conversation_id)


def delete_conversation(conversation_id: str) -> bool:
    document_reference = (
        db.collection(COLLECTION_NAME)
        .document(conversation_id)
    )
    snapshot = document_reference.get()

    if not snapshot.exists:
        return False

    document_reference.delete()
    return True