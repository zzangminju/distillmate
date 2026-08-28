import json
import os
from pathlib import Path

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, firestore

PROJECT_ROOT = Path(__file__).resolve().parents[3]

load_dotenv(PROJECT_ROOT / ".env")


def build_firebase_credential():
    service_account_json = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_JSON"
    )
    service_account_path = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_PATH"
    )

    if service_account_json:
        service_account_info = json.loads(
            service_account_json
        )
        return credentials.Certificate(
            service_account_info
        )

    if service_account_path:
        key_path = Path(service_account_path)

        if not key_path.is_absolute():
            key_path = PROJECT_ROOT / key_path

        if not key_path.exists():
            raise RuntimeError(
                f"Firebase 키 파일을 찾을 수 없습니다: {key_path}"
            )

        return credentials.Certificate(key_path)

    raise RuntimeError(
        "Firebase 서비스 계정 환경 변수가 설정되지 않았습니다."
    )


def get_firestore_client():
    try:
        firebase_admin.get_app()
    except ValueError:
        firebase_admin.initialize_app(
            build_firebase_credential()
        )

    return firestore.client()


db = get_firestore_client()