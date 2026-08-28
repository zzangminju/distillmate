import os
import ssl
from functools import lru_cache

import certifi
import httpx2
import openai._base_client as openai_base_client
from dotenv import load_dotenv
from openai import OpenAI

from ..models.chat import ChatRequest, ChatResponse
from ..models.conversation import (
    ConversationCreate,
    Message,
)
from .conversation_service import (
    append_messages,
    create_conversation,
    get_conversation,
)
from .data_service import get_data_list
from .summary_service import get_data_summary

load_dotenv()


@lru_cache(maxsize=1)
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        raise RuntimeError(
            "OPENAI_API_KEY가 설정되지 않았습니다."
        )

    # Windows 로컬 환경에서 OpenAI SDK의
    # 시스템 정보 조회 지연을 방지합니다.
    if os.name == "nt":
        openai_base_client.get_platform = (
            lambda: "windows"
        )

    # 로컬과 Render 모두 certifi 인증서 묶음을 사용합니다.
    # 최소 Linux 서버에서 시스템 인증서를 찾지 못해
    # OpenAI 연결이 실패하는 문제를 방지합니다.
    ssl_context = ssl.create_default_context(
        cafile=certifi.where(),
    )
    http_client = httpx2.Client(
        verify=ssl_context,
        timeout=30.0,
    )

    return OpenAI(
        api_key=api_key,
        http_client=http_client,
    )


def build_system_prompt():
    summary = get_data_summary()
    records = get_data_list()

    if summary is None or not records:
        raise RuntimeError(
            "AI 답변에 사용할 공정 데이터가 없습니다."
        )

    records_by_date = sorted(
        records,
        key=lambda record: record.date,
    )

    max_record = max(
        records,
        key=lambda record: record.value,
    )
    min_record = min(
        records,
        key=lambda record: record.value,
    )

    recent_records = records_by_date[-7:]

    recent_data_text = "\n".join(
        (
            f"- {record.date.isoformat()}: "
            f"스팀 원단위 {record.value}, "
            f"제품 순도 {record.product_purity_pct}%, "
            f"상태 {record.operating_status.value}, "
            f"메모: {record.memo}"
        )
        for record in recent_records
    )

    anomaly_dates_text = ", ".join(
        anomaly_date.isoformat()
        for anomaly_date in summary.anomaly_dates[:10]
    )

    maintenance_change = (
        summary.maintenance_effect.change_percent
    )

    if maintenance_change is None:
        maintenance_text = "계산할 수 없음"
    else:
        maintenance_text = (
            f"{maintenance_change}%"
        )

    return f"""
당신은 증류탑 운전 데이터를 설명하는
화학공학 공정 분석 AI 비서입니다.

[사용자 공정 데이터 요약]
- 데이터 기간: {summary.period}
- 총 데이터 개수: {summary.count}개
- 평균 스팀 원단위:
  {summary.metrics.average_steam_intensity}
  kg-steam/kg-product
- 최대 스팀 원단위:
  {summary.metrics.max_steam_intensity}
  kg-steam/kg-product
- 최소 스팀 원단위:
  {summary.metrics.min_steam_intensity}
  kg-steam/kg-product
- 평균 제품 순도:
  {summary.metrics.average_product_purity}%
- 제품 순도 기준 미달 횟수:
  {summary.metrics.off_spec_count}회
- 최근 추세:
  {summary.trend.status}
- 최근 7일 평균:
  {summary.trend.recent_7days_average}
  kg-steam/kg-product
- 이전 7일 평균:
  {summary.trend.previous_7days_average}
  kg-steam/kg-product
- 최근 변화율:
  {summary.trend.change_percent}%
- 이상 운전 횟수:
  {summary.anomaly_count}회
- 주요 이상 날짜:
  {anomaly_dates_text}
- 정비 전후 원단위 변화율:
  {maintenance_text}

[최대·최소 운전 기록]
- 최대 스팀 원단위 날짜:
  {max_record.date.isoformat()}
  ({max_record.value} kg-steam/kg-product)
- 최소 스팀 원단위 날짜:
  {min_record.date.isoformat()}
  ({min_record.value} kg-steam/kg-product)

[최근 7일 데이터]
{recent_data_text}

[답변 규칙]
1. 반드시 위 데이터에 근거해 한국어로 답변하세요.
2. 스팀 원단위가 증가하면 에너지 효율이
   악화된 것으로 설명하세요.
3. 스팀 원단위가 감소하면 에너지 효율이
   개선된 것으로 설명하세요.
4. 관찰된 상관관계와 확정된 원인을 구분하세요.
5. 데이터에 없는 원인을 단정하지 마세요.
6. 숫자를 말할 때 단위를 함께 표시하세요.
7. 답변은 이해하기 쉽게 2~5문장으로 작성하세요.
8. 실제 설비 운전값 변경은 현장 엔지니어의
   검토가 필요하다고 안내하세요.
""".strip()


def generate_chat_response(
    payload: ChatRequest,
) -> ChatResponse:
    existing_conversation = None

    if payload.conversation_id:
        existing_conversation = get_conversation(
            payload.conversation_id
        )

        if existing_conversation is None:
            raise ValueError(
                "이어갈 대화를 찾을 수 없습니다."
            )

    input_messages = []

    if existing_conversation:
        for message in existing_conversation.messages[-10:]:
            input_messages.append(
                {
                    "role": message.role,
                    "content": message.content,
                }
            )

    input_messages.append(
        {
            "role": "user",
            "content": payload.message,
        }
    )

    client = get_openai_client()

    model_name = os.getenv(
        "OPENAI_MODEL",
        "gpt-4.1-mini",
    )

    response = client.responses.create(
        model=model_name,
        instructions=build_system_prompt(),
        input=input_messages,
        max_output_tokens=500,
        store=False,
    )

    answer = response.output_text.strip()

    if not answer:
        raise RuntimeError(
            "OpenAI에서 빈 답변을 반환했습니다."
        )

    new_messages = [
        Message(
            role="user",
            content=payload.message,
        ),
        Message(
            role="assistant",
            content=answer,
        ),
    ]

    if existing_conversation:
        updated_conversation = append_messages(
            existing_conversation.id,
            new_messages,
        )

        if updated_conversation is None:
            raise RuntimeError(
                "대화 저장에 실패했습니다."
            )

        conversation_id = updated_conversation.id

    else:
        title = payload.message.strip().replace(
            "\n",
            " ",
        )[:40]

        created_conversation = create_conversation(
            ConversationCreate(
                title=title,
                messages=new_messages,
            )
        )

        conversation_id = created_conversation.id

    return ChatResponse(
        answer=answer,
        conversation_id=conversation_id,
    )
