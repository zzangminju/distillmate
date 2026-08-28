import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers.chat import router as chat_router
from .routers.conversations import (
    router as conversations_router,
)
from .routers.data import router as data_router

load_dotenv()

app = FastAPI(
    title="DistillMate API",
    description="증류탑 에너지·품질 운전 분석 AI 비서",
    version="0.1.0",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5500,http://127.0.0.1:5500",
    ).split(",")
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(data_router)
app.include_router(conversations_router)
app.include_router(chat_router)


@app.get("/health", tags=["health"])
def health_check():
    return {
        "status": "ok",
        "service": "DistillMate API",
        "allowed_origins": allowed_origins,
    }