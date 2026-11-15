"""Versioned API routes."""

from fastapi import APIRouter

from dancing_with_sars.api.routes import health, vegetation

API_V1_PREFIX = "/api/v1"

api_v1_router = APIRouter(prefix=API_V1_PREFIX)
api_v1_router.include_router(health.router)
api_v1_router.include_router(vegetation.router)

__all__ = ["API_V1_PREFIX", "api_v1_router"]
