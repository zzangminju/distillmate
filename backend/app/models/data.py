from datetime import date
from enum import Enum

from pydantic import BaseModel, Field, model_validator


class OperatingStatus(str, Enum):
    NORMAL = "NORMAL"
    PARTIAL_LOAD = "PARTIAL_LOAD"
    MAINTENANCE = "MAINTENANCE"
    ABNORMAL = "ABNORMAL"


class DataBase(BaseModel):
    date: date
    value: float = Field(
        gt=0,
        description="제품 단위당 스팀 사용량",
    )
    memo: str = Field(
        min_length=1,
        max_length=500,
    )
    feed_flow_kg_h: float = Field(gt=0)
    steam_flow_kg_h: float = Field(gt=0)
    distillate_flow_kg_h: float = Field(gt=0)
    reflux_ratio: float = Field(gt=0)
    product_purity_pct: float = Field(ge=0, le=100)
    top_temperature_c: float
    bottom_temperature_c: float
    operating_status: OperatingStatus

    @model_validator(mode="after")
    def validate_steam_intensity(self):
        calculated_value = (
            self.steam_flow_kg_h / self.distillate_flow_kg_h
        )

        if abs(self.value - calculated_value) > 0.02:
            raise ValueError(
                "value는 steam_flow_kg_h를 "
                "distillate_flow_kg_h로 나눈 값과 일치해야 합니다."
            )

        return self


class DataCreate(DataBase):
    pass


class DataUpdate(DataBase):
    pass


class DataResponse(DataBase):
    id: str