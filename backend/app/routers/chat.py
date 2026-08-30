import logging

from fastapi import APIRouter, HTTPException, status
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
)

from ..models.chat import ChatRequest, ChatResponse
from ..services.chat_service import generate_chat_response

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api",
    tags=["chat"],
)


@router.post(
    "/chat",
    response_model=ChatResponse,
)
def chat(payload: ChatRequest):
    try:
        return generate_chat_response(payload)

    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(error),
        ) from error

    except APITimeoutError as error:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=(
                "AI 응답 시간이 초과됐습니다. "
                "잠시 후 다시 시도해주세요."
            ),
        ) from error

    except APIConnectionError as error:
        logger.exception(
            "OpenAI API connection failed"
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=(
                "OpenAI API에 연결할 수 없습니다."
            ),
        ) from error

    except APIStatusError as error:
        if error.status_code == 429:
            detail = (
                "OpenAI API 사용량 또는 "
                "결제 한도를 확인해주세요."
            )
        else:
            detail = (
                "OpenAI API 요청 처리에 실패했습니다."
            )

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=detail,
        ) from error

    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(error),
        ) from error
