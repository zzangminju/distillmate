from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


def utc_now():
    return datetime.now(timezone.utc)


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(
        min_length=1,
        max_length=5000,
    )
    timestamp: datetime = Field(
        default_factory=utc_now,
    )


class ConversationCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=100,
    )
    messages: list[Message] = Field(
        default_factory=list,
    )


class ConversationResponse(BaseModel):
    id: str
    title: str
    messages: list[Message]
    created_at: datetime
    updated_at: datetime