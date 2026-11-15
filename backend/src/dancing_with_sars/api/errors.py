"""API error handling: one predictable envelope for every failure."""

from __future__ import annotations

import logging
from collections.abc import Sequence

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from dancing_with_sars.api.schemas import ErrorDetailResponse, ErrorResponse
from dancing_with_sars.application.errors import ApplicationError, ErrorDetail

logger = logging.getLogger(__name__)

INVALID_REQUEST_CODE = "INVALID_REQUEST"
INTERNAL_ERROR_CODE = "INTERNAL_ERROR"

_HTTP_STATUS_BY_APPLICATION_CODE: dict[str, int] = {
    "INVALID_DATE_RANGE": 422,
    "UNSUPPORTED_INDEX": 422,
    "PARCEL_NOT_FOUND": 404,
    "SOURCE_UNAVAILABLE": 503,
    "PROCESSING_FAILED": 500,
}

_HTTP_EXCEPTION_CODES: dict[int, str] = {
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
}

# Request locations FastAPI distinguishes that must not leak into field paths.
_VALIDATION_LOCATIONS = frozenset({"query", "path", "header", "cookie", "body"})


def register_error_handlers(app: FastAPI) -> None:
    """Attach the handlers producing the documented error envelope."""

    app.add_exception_handler(ApplicationError, _handle_application_error)
    app.add_exception_handler(RequestValidationError, _handle_request_validation_error)
    app.add_exception_handler(StarletteHTTPException, _handle_http_exception)
    app.add_exception_handler(Exception, _handle_unexpected_error)


def error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    details: Sequence[ErrorDetail] = (),
) -> JSONResponse:
    """Build an error response whose body follows the shared error contract."""

    body = ErrorResponse(
        code=code,
        message=message,
        details=[
            ErrorDetailResponse(
                field_path=detail.field_path,
                code=detail.code,
                message=detail.message,
            )
            for detail in details
        ],
    )
    return JSONResponse(
        status_code=status_code,
        content=body.model_dump(by_alias=True, mode="json"),
    )


async def _handle_application_error(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, ApplicationError):  # pragma: no cover - handler contract
        return await _handle_unexpected_error(request, exc)
    status_code = _HTTP_STATUS_BY_APPLICATION_CODE.get(exc.code, 500)
    return error_response(
        status_code=status_code,
        code=exc.code,
        message=exc.message,
        details=exc.details,
    )


async def _handle_request_validation_error(
    request: Request, exc: Exception
) -> JSONResponse:
    if not isinstance(exc, RequestValidationError):  # pragma: no cover - handler contract
        return await _handle_unexpected_error(request, exc)
    details = tuple(_validation_detail(error) for error in exc.errors())
    return error_response(
        status_code=422,
        code=INVALID_REQUEST_CODE,
        message="The request is invalid.",
        details=details,
    )


async def _handle_http_exception(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, StarletteHTTPException):  # pragma: no cover - handler contract
        return await _handle_unexpected_error(request, exc)
    code = _HTTP_EXCEPTION_CODES.get(exc.status_code, f"HTTP_{exc.status_code}")
    message = exc.detail if isinstance(exc.detail, str) else "The request could not be served."
    return error_response(status_code=exc.status_code, code=code, message=message)


async def _handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error while serving %s %s", request.method, request.url.path)
    return error_response(
        status_code=500,
        code=INTERNAL_ERROR_CODE,
        message="An unexpected internal error occurred.",
    )


def _validation_detail(error: dict[str, object]) -> ErrorDetail:
    location = error.get("loc", ())
    field_path = ".".join(
        str(part) for part in location if str(part) not in _VALIDATION_LOCATIONS
    )
    error_type = str(error.get("type", "invalid"))
    return ErrorDetail(
        message=str(error.get("msg", "Invalid value.")),
        field_path=field_path or None,
        code=error_type.upper().replace(".", "_").replace("-", "_"),
    )
