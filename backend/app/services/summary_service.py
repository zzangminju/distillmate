from statistics import mean, pstdev

from ..models.data import OperatingStatus
from ..models.summary import (
    DataSummaryResponse,
    MaintenanceEffect,
    SummaryMetrics,
    TrendSummary,
)
from .data_service import get_data_list

PRODUCT_PURITY_SPEC = 95.0


def calculate_change_percent(
    current_value: float,
    previous_value: float,
) -> float:
    if previous_value == 0:
        return 0.0

    return (
        (current_value - previous_value)
        / previous_value
        * 100
    )


def get_data_summary() -> DataSummaryResponse | None:
    records = sorted(
        get_data_list(),
        key=lambda record: record.date,
    )

    if not records:
        return None

    steam_intensities = [
        record.value for record in records
    ]
    product_purities = [
        record.product_purity_pct for record in records
    ]

    average_intensity = mean(steam_intensities)
    standard_deviation = pstdev(steam_intensities)

    anomaly_threshold = (
        average_intensity + 2 * standard_deviation
    )

    anomaly_records = [
        record
        for record in records
        if (
            record.value > anomaly_threshold
            or record.operating_status
            == OperatingStatus.ABNORMAL
        )
    ]

    off_spec_count = sum(
        1
        for record in records
        if record.product_purity_pct
        < PRODUCT_PURITY_SPEC
    )

    recent_records = records[-7:]
    previous_records = records[-14:-7]

    recent_average = mean(
        record.value for record in recent_records
    )
    previous_average = mean(
        record.value for record in previous_records
    )

    trend_change = calculate_change_percent(
        recent_average,
        previous_average,
    )

    if trend_change >= 3:
        trend_status = "에너지 효율 악화"
    elif trend_change <= -3:
        trend_status = "에너지 효율 개선"
    else:
        trend_status = "에너지 효율 유지"

    maintenance_index = next(
        (
            index
            for index, record in enumerate(records)
            if record.operating_status
            == OperatingStatus.MAINTENANCE
        ),
        None,
    )

    before_average = None
    after_average = None
    maintenance_change = None

    if maintenance_index is not None:
        before_records = records[
            max(0, maintenance_index - 14):
            maintenance_index
        ]
        after_records = records[
            maintenance_index + 1:
            maintenance_index + 15
        ]

        if before_records and after_records:
            before_average = mean(
                record.value
                for record in before_records
            )
            after_average = mean(
                record.value
                for record in after_records
            )
            maintenance_change = (
                calculate_change_percent(
                    after_average,
                    before_average,
                )
            )

    return DataSummaryResponse(
        period=(
            f"{records[0].date.isoformat()} ~ "
            f"{records[-1].date.isoformat()}"
        ),
        count=len(records),
        metrics=SummaryMetrics(
            average_steam_intensity=round(
                average_intensity,
                3,
            ),
            max_steam_intensity=round(
                max(steam_intensities),
                3,
            ),
            min_steam_intensity=round(
                min(steam_intensities),
                3,
            ),
            average_product_purity=round(
                mean(product_purities),
                2,
            ),
            off_spec_count=off_spec_count,
        ),
        trend=TrendSummary(
            recent_7days_average=round(
                recent_average,
                3,
            ),
            previous_7days_average=round(
                previous_average,
                3,
            ),
            change_percent=round(
                trend_change,
                2,
            ),
            status=trend_status,
        ),
        anomaly_count=len(anomaly_records),
        anomaly_dates=[
            record.date for record in anomaly_records
        ],
        maintenance_effect=MaintenanceEffect(
            before_average=(
                round(before_average, 3)
                if before_average is not None
                else None
            ),
            after_average=(
                round(after_average, 3)
                if after_average is not None
                else None
            ),
            change_percent=(
                round(maintenance_change, 2)
                if maintenance_change is not None
                else None
            ),
        ),
    )