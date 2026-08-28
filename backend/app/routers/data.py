from fastapi import APIRouter, HTTPException, status

from ..models.data import DataCreate, DataResponse, DataUpdate
from ..models.summary import DataSummaryResponse
from ..services.data_service import (
    create_data as create_data_in_firestore,
    delete_data as delete_data_in_firestore,
    get_data_list as get_data_list_from_firestore,
    update_data as update_data_in_firestore,
)
from ..services.summary_service import get_data_summary

router = APIRouter(
    prefix="/api/data",
    tags=["data"],
)


@router.get(
    "/summary",
    response_model=DataSummaryResponse,
)
def read_data_summary():
    summary = get_data_summary()

    if summary is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="요약할 데이터가 없습니다.",
        )

    return summary


@router.post(
    "",
    response_model=DataResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_data(payload: DataCreate):
    return create_data_in_firestore(payload)


@router.get(
    "",
    response_model=list[DataResponse],
)
def get_data_list():
    return get_data_list_from_firestore()


@router.put(
    "/{data_id}",
    response_model=DataResponse,
)
def update_data(data_id: str, payload: DataUpdate):
    updated_record = update_data_in_firestore(
        data_id,
        payload,
    )

    if updated_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="데이터를 찾을 수 없습니다.",
        )

    return updated_record


@router.delete("/{data_id}")
def delete_data(data_id: str):
    deleted = delete_data_in_firestore(data_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="데이터를 찾을 수 없습니다.",
        )

    return {
        "message": "데이터가 삭제되었습니다.",
        "id": data_id,
    }