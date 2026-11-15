"""Application errors mapped to the public API error envelope.

These errors must not import FastAPI or mention HTTP status codes; the API layer
owns the HTTP mapping so the application layer stays framework-independent.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ErrorDetail:
    """A field-level or source-specific detail attached to an application error."""

    message: str
    field_path: str | None = None
    code: str | None = None


class ApplicationError(Exception):
    """Base class for errors the API can translate into the documented envelope."""

    code = "INTERNAL_ERROR"

    def __init__(
        self,
        message: str,
        *,
        details: tuple[ErrorDetail, ...] = (),
    ) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class InvalidDateRangeError(ApplicationError):
    """The requested end date precedes the start date."""

    code = "INVALID_DATE_RANGE"


class UnsupportedIndexError(ApplicationError):
    """The requested derived index is not supported by the first workflow."""

    code = "UNSUPPORTED_INDEX"


class ParcelNotFoundError(ApplicationError):
    """No parcel exists for the supplied internal identifier."""

    code = "PARCEL_NOT_FOUND"


class SourceUnavailableError(ApplicationError):
    """The scientific layer could not reach its approved data source."""

    code = "SOURCE_UNAVAILABLE"


class ProcessingFailedError(ApplicationError):
    """Scientific processing failed or produced a result the contract cannot serve."""

    code = "PROCESSING_FAILED"
