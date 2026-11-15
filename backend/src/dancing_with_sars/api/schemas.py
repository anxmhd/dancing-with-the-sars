"""Public API response schemas.

These schemas mirror ``docs/DATA_CONTRACTS.md``: camelCase JSON property names,
GeoJSON member names untouched (no geometry is served by this workflow), finite
numbers only, and explicit ``null`` for unknown-but-present values.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
    """Base model serializing Python ``snake_case`` fields as camelCase JSON."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )


class ApiIndex(str, Enum):
    NDVI = "NDVI"


class ApiResultStatus(str, Enum):
    AVAILABLE = "available"
    NO_OBSERVATIONS = "noObservations"
    NO_VALID_OBSERVATIONS = "noValidObservations"


class ApiQualityStatus(str, Enum):
    ACCEPTED = "accepted"
    EXCLUDED = "excluded"
    UNKNOWN = "unknown"


class DataQualityResponse(ApiModel):
    status: ApiQualityStatus = Field(
        description="Parcel-level quality outcome for this result, not a general sensor rating."
    )
    flags: list[str] | None = Field(
        description=(
            "Preserved or documented QA flags. null means unavailable/unknown; "
            "[] means flags were assessed and none apply."
        )
    )
    reasons: list[str] = Field(
        description="Explanation codes or text for exclusion or unknown status."
    )
    valid_pixel_count: int | None = Field(
        default=None,
        ge=0,
        description="Pixels included by the approved aggregation, if meaningful and available.",
    )
    total_pixel_count: int | None = Field(
        default=None,
        ge=0,
        description="Candidate pixels in the parcel for this acquisition, if meaningful.",
    )


class VegetationObservationResponse(ApiModel):
    observation_id: str = Field(description="Opaque internal result identifier.")
    acquisition_id: str = Field(description="Internal reference to the acquisition candidate.")
    acquired_at: datetime | None = Field(
        description="Acquisition time when source metadata supplies it; otherwise null."
    )
    observation_date: date = Field(
        description="Source acquisition calendar date used to order and label the series."
    )
    value: float | None = Field(
        description="Parcel-level NDVI only when quality status is 'accepted'; otherwise null."
    )
    quality: DataQualityResponse = Field(description="Quality state for this parcel result.")


class DataProvenanceResponse(ApiModel):
    provider: str = Field(description="Source/provider name.")
    dataset_name: str = Field(description="Human-readable dataset/collection name.")
    external_dataset_id: str | None = Field(
        description="Provider collection identifier when known; otherwise null."
    )
    external_product_ids: list[str] | None = Field(
        description="Provider product identifiers actually used; null when not available."
    )
    external_acquisition_ids: list[str] | None = Field(
        description="Provider acquisition identifiers when supplied; null when not available."
    )
    product_version: str | None = Field(description="Product version or processing level.")
    processing_software: str | None = Field(description="Processing implementation and version.")
    processing_method: str = Field(description="Stable method name/version or reference.")
    processing_parameters: dict[str, Any] = Field(
        description="Parameters that affect the result; empty only when none apply."
    )
    processed_at: datetime | None = Field(description="Time the result was generated, if recorded.")


class VegetationSeriesResponse(ApiModel):
    parcel_id: str = Field(description="Internal selected parcel identifier.")
    index: ApiIndex = Field(description="Indicator returned; initially NDVI.")
    unit: Literal["1"] = Field(
        description="Unit for every value in this response. NDVI is dimensionless; '1'."
    )
    start_date: date = Field(description="Inclusive range start echoed from the request.")
    end_date: date = Field(description="Inclusive range end echoed from the request.")
    result_status: ApiResultStatus = Field(
        description=(
            "available when at least one accepted value exists, noObservations when no "
            "candidate acquisition exists in range, noValidObservations when candidates "
            "exist but none was accepted."
        )
    )
    observations: list[VegetationObservationResponse] = Field(
        description="Candidate acquisition results in chronological order; empty when none exist."
    )
    provenance: DataProvenanceResponse = Field(
        description="Source and processing lineage applicable to this response."
    )


class HealthResponse(ApiModel):
    status: Literal["ok"] = Field(description="Service availability.")
    service: str = Field(description="Service identifier.")
    version: str = Field(description="Backend package version.")
    science_provider: str = Field(
        description="Science provider currently wired behind the application/science interface."
    )


class ErrorDetailResponse(ApiModel):
    field_path: str | None = Field(description="Input field related to the detail, if applicable.")
    code: str | None = Field(description="Stable machine-readable detail code, if available.")
    message: str = Field(description="Human-readable explanation of this detail.")


class ErrorResponse(ApiModel):
    code: str = Field(description="Stable machine-readable error code.")
    message: str = Field(description="Safe, user-readable summary.")
    details: list[ErrorDetailResponse] = Field(
        description="Field-level or source-specific details; empty if none."
    )
