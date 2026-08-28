import csv
from pathlib import Path

from backend.app.database.firestore import db
from backend.app.models.data import DataCreate

PROJECT_ROOT = Path(__file__).resolve().parents[1]
CSV_FILE = PROJECT_ROOT / "data" / "distillation_data.csv"

COLLECTION_NAME = "data"


def load_csv_data():
    with CSV_FILE.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as csv_file:
        reader = csv.DictReader(csv_file)
        return list(reader)


def seed_firestore():
    csv_rows = load_csv_data()
    batch = db.batch()

    for csv_row in csv_rows:
        validated_data = DataCreate(**csv_row)
        document_data = validated_data.model_dump(
            mode="json"
        )

        # 날짜를 문서 ID로 사용하므로 다시 실행해도
        # 동일 날짜의 문서가 중복 생성되지 않습니다.
        document_id = document_data["date"]

        document_reference = (
            db.collection(COLLECTION_NAME)
            .document(document_id)
        )

        batch.set(
            document_reference,
            document_data,
        )

    batch.commit()

    print(f"{len(csv_rows)}개의 데이터를 Firestore에 저장했습니다.")


if __name__ == "__main__":
    seed_firestore()