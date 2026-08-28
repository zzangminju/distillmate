from fastapi import APIRouter, HTTPException, status

from ..models.conversation import (
    ConversationCreate,
    ConversationResponse,
)
from ..services.conversation_service import (
    create_conversation as create_conversation_in_firestore,
    delete_conversation as delete_conversation_in_firestore,
    get_conversation as get_conversation_from_firestore,
    get_conversation_list as get_conversation_list_from_firestore,
)

router = APIRouter(
    prefix="/api/conversations",
    tags=["conversations"],
)


@router.post(
    "",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(payload: ConversationCreate):
    return create_conversation_in_firestore(payload)


@router.get(
    "",
    response_model=list[ConversationResponse],
)
def get_conversation_list():
    return get_conversation_list_from_firestore()


@router.get(
    "/{conversation_id}",
    response_model=ConversationResponse,
)
def get_conversation(conversation_id: str):
    conversation = get_conversation_from_firestore(
        conversation_id
    )

    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="대화를 찾을 수 없습니다.",
        )

    return conversation


@router.delete("/{conversation_id}")
def delete_conversation(conversation_id: str):
    deleted = delete_conversation_in_firestore(
        conversation_id
    )

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="대화를 찾을 수 없습니다.",
        )

    return {
        "message": "대화가 삭제되었습니다.",
        "id": conversation_id,
    }