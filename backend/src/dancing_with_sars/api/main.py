"""FastAPI application exposing local, already-processed parcel observations."""

from __future__ import annotations

import json
import logging
import os
from datetime import date
from enum import Enum
from pathlib import Path
from typing import Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

from dancing_with_sars.api.serializers import (
    artifact_parcel_id,
    load_parcels,
    load_result_artifacts,
    result_date,
    serialize_artifact,
)

logger = logging.getLogger(__name__)
DEFAULT_CORS_ORIGINS = (
    "http://localhost:5173",
    "http://127.0.0.1:5173",
)


def _cors_origins() -> list[str]:
    configured_origins = os.getenv("CORS_ORIGINS", ",".join(DEFAULT_CORS_ORIGINS))
    return [
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    ]


app = FastAPI(
    title="Dancing with the SARs API",
    description=(
        "Read-only API for source-backed parcels and locally processed Sentinel-1, "
        "Sentinel-2, and NISAR parcel result artifacts. Local artifact coverage is limited."
    ),
    version="1.0.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)
ROOT = Path(__file__).resolve().parents[4]


def _error_response(description: str) -> dict[str, Any]:
    return {
        "description": description,
        "content": {
            "application/json": {
                "schema": {"$ref": "#/components/schemas/ApiError"}
            }
        },
    }


def _custom_openapi() -> dict[str, Any]:
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    schema["components"]["schemas"]["MultisensorResponse"] = json.loads(
        (ROOT / "contracts" / "multisensor-response.schema.json").read_text(encoding="utf-8")
    )
    schema["components"]["schemas"]["ApiError"] = json.loads(
        (ROOT / "contracts" / "api-error.schema.json").read_text(encoding="utf-8")
    )
    app.openapi_schema = schema
    return schema


app.openapi = _custom_openapi


class Mission(str, Enum):
    sentinel2 = "Sentinel-2"
    sentinel1 = "Sentinel-1"
    nisar = "NISAR"


def _error(code: str, message: str, status_code: int) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message, "requestId": str(uuid4())}},
    )


@app.exception_handler(HTTPException)
async def http_error_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    code = "parcelNotFound" if exc.status_code == 404 else "invalidRequest"
    return _error(code, str(exc.detail), exc.status_code)


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    errors = "; ".join(error["msg"] for error in exc.errors())
    return _error("invalidRequest", errors or "Invalid request.", 400)


@app.exception_handler(Exception)
async def unexpected_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    request_id = str(uuid4())
    logger.exception("Unhandled API error request_id=%s", request_id, exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internalError",
                "message": "The request could not be completed.",
                "requestId": request_id,
            }
        },
    )


@app.get("/api/v1/health", tags=["system"])
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/parcels", tags=["parcels"], summary="List locally available parcels")
async def list_parcels() -> dict[str, Any]:
    """Return source-backed parcel features currently available in the local demo."""
    return parcel_feature_collection()


def parcel_feature_collection() -> dict[str, Any]:
    parcels = load_parcels()
    for parcel in parcels:
        parcel["id"] = parcel["properties"]["parcel_id"]
    return {"type": "FeatureCollection", "features": parcels}


def parcel_feature(parcel_id: str) -> dict[str, Any]:
    for parcel in load_parcels():
        if parcel["properties"]["parcel_id"] == parcel_id:
            parcel["id"] = parcel_id
            return parcel
    raise HTTPException(status_code=404, detail=f"Parcel '{parcel_id}' was not found.")


@app.get("/api/v1/parcels/{parcel_id}", tags=["parcels"], summary="Get a parcel feature")
async def get_parcel(parcel_id: str) -> dict[str, Any]:
    return parcel_feature(parcel_id)


@app.get(
    "/api/v1/parcels/{parcel_id}/observations",
    tags=["observations"],
    summary="Query locally processed multisensor observations",
    responses={
        200: {
            "description": "Canonical contract-shaped result; includes per-sensor availability.",
            "content": {
                "application/json": {
                    "schema": {"$ref": "#/components/schemas/MultisensorResponse"}
                }
            },
        },
        400: _error_response("Invalid date range or requested mission."),
        404: _error_response("Parcel identifier is not present in the local reference set."),
        500: _error_response("Unexpected application error."),
    },
)
async def get_observations(
    parcel_id: str,
    start_date: date = Query(alias="startDate", description="Inclusive start date (YYYY-MM-DD)."),
    end_date: date = Query(alias="endDate", description="Inclusive end date (YYYY-MM-DD)."),
    missions: list[Mission] | None = Query(default=None),
) -> dict[str, Any]:
    """Return contract-shaped results for local processed artifacts in the date window."""
    return build_observation_response(parcel_id, start_date, end_date, missions)


def build_observation_response(
    parcel_id: str,
    start_date: date,
    end_date: date,
    missions: list[Mission] | None,
) -> dict[str, Any]:
    """Build the API response from the finite set of local CLI artifacts."""
    parcel_feature(parcel_id)
    if end_date < start_date:
        raise HTTPException(status_code=400, detail="endDate must not precede startDate.")

    requested = [mission.value for mission in (missions or list(Mission))]
    if missions is not None and not missions:
        raise HTTPException(status_code=400, detail="At least one mission must be requested.")
    if len(requested) != len(set(requested)):
        raise HTTPException(status_code=400, detail="Duplicate requested missions are not allowed.")
    by_mission: dict[str, list[dict[str, Any]]] = {}
    for mission, artifact in load_result_artifacts():
        # Local artifacts cover several parcels; never mix another parcel's series in.
        if artifact_parcel_id(artifact) != parcel_id:
            continue
        observation = serialize_artifact(mission, artifact)
        if start_date <= result_date(observation) <= end_date:
            by_mission.setdefault(mission, []).append(observation)

    observations = []
    for mission in requested:
        for observation in sorted(
            by_mission.get(mission, []), key=lambda item: item["acquiredAt"]
        ):
            observations.append(observation)
    observations.sort(key=lambda item: item["acquiredAt"])
    sensor_results = []
    for mission in requested:
        mission_observations = by_mission.get(mission, [])
        count = len(mission_observations)
        if count == 0:
            # The local archive contains only explicit processed artifacts. Without a
            # catalog search it cannot establish that the satellite had no acquisition.
            status = "unavailable"
        elif any(
            measurement["quality"]["status"] == "accepted"
            and measurement["value"] is not None
            for observation in mission_observations
            for measurement in observation["measurements"]
        ):
            status = "available"
        else:
            status = "noValidObservations"
        sensor_results.append(
            {"mission": mission, "status": status, "observationCount": count}
        )

    return {
        "contractVersion": "1.0",
        "parcelId": parcel_id,
        "query": {
            "startDate": start_date.isoformat(),
            "endDate": end_date.isoformat(),
            "requestedMissions": requested,
        },
        "sensorResults": sensor_results,
        "observations": observations,
    }
