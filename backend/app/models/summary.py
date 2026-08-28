from datetime import date

from pydantic import BaseModel


class SummaryMetrics(BaseModel):
    average_steam_intensity: float
    max_steam_intensity: float
    min_steam_intensity: float
    average_product_purity: float
    off_spec_count: int


class TrendSummary(BaseModel):
    recent_7days_average: float
    previous_7days_average: float
    change_percent: float
    status: str


class MaintenanceEffect(BaseModel):
    before_average: float | None
    after_average: float | None
    change_percent: float | None


class DataSummaryResponse(BaseModel):
    period: str
    count: int
    metrics: SummaryMetrics
    trend: TrendSummary
    anomaly_count: int
    anomaly_dates: list[date]
    maintenance_effect: MaintenanceEffect