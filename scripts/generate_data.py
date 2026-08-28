import csv
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(42)

PROJECT_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_FILE = PROJECT_ROOT / "data" / "distillation_data.csv"

FIELDNAMES = [
    "date",
    "value",
    "memo",
    "feed_flow_kg_h",
    "steam_flow_kg_h",
    "distillate_flow_kg_h",
    "reflux_ratio",
    "product_purity_pct",
    "top_temperature_c",
    "bottom_temperature_c",
    "operating_status",
]

start_date = date(2026, 1, 1)
rows = []

# 의도적으로 이상 운전으로 설정할 날짜 인덱스
anomaly_indices = {162, 165, 169, 173, 177}

for index in range(180):
    current_date = start_date + timedelta(days=index)

    # 정상 운전 기본값
    feed_flow = random.uniform(970, 1030)
    distillate_flow = random.uniform(238, 262)
    reflux_ratio = random.uniform(2.0, 2.2)
    purity = random.uniform(95.8, 96.5)
    top_temperature = random.uniform(81.8, 82.6)
    bottom_temperature = random.uniform(108.1, 109.0)
    steam_intensity = random.uniform(1.18, 1.25)
    status = "NORMAL"
    memo = "정상 운전"

    if 50 <= index < 70:
        # 원료 조성 변화로 제품 순도 변동
        reflux_ratio = random.uniform(2.15, 2.35)
        purity = random.uniform(94.4, 95.4)
        top_temperature = random.uniform(82.8, 84.0)
        bottom_temperature = random.uniform(108.8, 109.8)
        steam_intensity = random.uniform(1.27, 1.34)
        status = "ABNORMAL" if purity < 95.0 else "NORMAL"
        memo = "원료 조성 변화로 제품 순도 변동"

    elif 70 <= index < 100:
        # 순도 회복을 위해 환류비를 높인 운전
        reflux_ratio = random.uniform(2.45, 2.75)
        purity = random.uniform(96.7, 97.3)
        top_temperature = random.uniform(81.6, 82.1)
        bottom_temperature = random.uniform(109.0, 110.0)
        steam_intensity = random.uniform(1.35, 1.43)
        memo = "제품 순도 확보를 위해 환류비 상향"

    elif 100 <= index < 125:
        # 열교환 성능 저하를 가정한 점진적 효율 악화
        degradation = (index - 100) * 0.006
        reflux_ratio = random.uniform(2.2, 2.4)
        purity = random.uniform(95.7, 96.2)
        top_temperature = random.uniform(82.0, 82.8)
        bottom_temperature = random.uniform(109.0, 110.2)
        steam_intensity = 1.29 + degradation + random.uniform(-0.015, 0.015)
        status = "ABNORMAL" if steam_intensity > 1.40 else "NORMAL"
        memo = "열교환 성능 저하에 따른 스팀 원단위 상승"

    elif index == 125:
        # 정비 완료 후 시험 운전
        feed_flow = 650
        distillate_flow = 155
        reflux_ratio = 2.2
        purity = 95.7
        top_temperature = 82.5
        bottom_temperature = 109.1
        steam_intensity = 1.28
        status = "MAINTENANCE"
        memo = "열교환기 정비 완료 후 시험 운전"

    elif 126 <= index < 160:
        # 정비 후 효율 회복
        reflux_ratio = random.uniform(2.05, 2.2)
        purity = random.uniform(96.1, 96.7)
        top_temperature = random.uniform(81.8, 82.4)
        bottom_temperature = random.uniform(108.0, 108.8)
        steam_intensity = random.uniform(1.15, 1.22)
        memo = "정비 후 정상 운전"

    elif index in anomaly_indices:
        # 명확한 이상 운전 데이터
        reflux_ratio = random.uniform(2.7, 3.0)
        purity = random.uniform(93.8, 94.8)
        top_temperature = random.uniform(84.0, 85.0)
        bottom_temperature = random.uniform(110.0, 111.0)
        steam_intensity = random.uniform(1.52, 1.68)
        status = "ABNORMAL"
        memo = "스팀 원단위 상승 및 제품 순도 기준 미달"

    steam_flow = steam_intensity * distillate_flow
    calculated_value = steam_flow / distillate_flow

    rows.append(
        {
            "date": current_date.isoformat(),
            "value": round(calculated_value, 3),
            "memo": memo,
            "feed_flow_kg_h": round(feed_flow, 2),
            "steam_flow_kg_h": round(steam_flow, 2),
            "distillate_flow_kg_h": round(distillate_flow, 2),
            "reflux_ratio": round(reflux_ratio, 2),
            "product_purity_pct": round(purity, 2),
            "top_temperature_c": round(top_temperature, 2),
            "bottom_temperature_c": round(bottom_temperature, 2),
            "operating_status": status,
        }
    )

OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

with OUTPUT_FILE.open("w", newline="", encoding="utf-8-sig") as csv_file:
    writer = csv.DictWriter(csv_file, fieldnames=FIELDNAMES)
    writer.writeheader()
    writer.writerows(rows)

print(f"{len(rows)}개의 데이터를 생성했습니다.")
print(f"저장 위치: {OUTPUT_FILE}")