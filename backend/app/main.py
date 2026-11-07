import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, items

app = FastAPI(title="Scheduling Planner API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(items.router, prefix="/api")
