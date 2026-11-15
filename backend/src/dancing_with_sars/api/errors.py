"""API error handling: one predictable envelope for every failure."""

from __future__ import annotations

import logging
from collections.abc import Sequence

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from dancing_with_sars.application.errors import ApplicationError, ErrorDetail

logger = logging.getLogger(__name__)

INVALID_REQUEST_CODE = "invalidRequest"
PARCEL_NOT_FOUND_CODE = "parcelNotFound"
INTERNAL_ERROR_CODE = "internalError"

_APPLICATION_CODE_TO_CONTRACT: dict[str, str] = {
    "INVALID_DATE_RANGE": INVALID_REQUEST_CODE,
    "UNSUPPORTED_INDEX": INVALID_REQUEST_CODE,
    "PARCEL_NOT_FOUND": PARCEL_NOT_FOUND_CODE,
    "SOURCE_UNAVAILABLE": INTERNAL_ERROR_CODE,
    "PROCESSING_FAILED": INTERNAL_ERROR_CODE,
    "INVALID_REQUEST": INVALID_REQUEST_CODE,
}

_HTTP_STATUS_BY_APPLICATION_CODE: dict[str, int] = {
    "INVALID_DATE_RANGE": 400,
    "UNSUPPORTED_INDEX": 400,
    "PARCEL_NOT_FOUND": 404,
    "SOURCE_UNAVAILABLE": 500,
    "PROCESSING_FAILED": 500,
    "INVALID_REQUEST": 400,
}


def _contract_code(application_code: str) -> str:
    return _APPLICATION_CODE_TO_CONTRACT.get(application_code, INTERNAL_ERROR_CODE)


def register_error_handlers(app: FastAPI) -> None:
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
    body = {
        "error": {
            "code": code,
            "message": message,
            "requestId": None,
        }
    }
    return JSONResponse(status_code=status_code, content=body)


async def _handle_application_error(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, ApplicationError):  # pragma: no cover
        return await _handle_unexpected_error(request, exc)
    status_code = _HTTP_STATUS_BY_APPLICATION_CODE.get(exc.code, 500)
    return error_response(
        status_code=status_code,
        code=_contract_code(exc.code),
        message=exc.message,
    )


async def _handle_request_validation_error(
    request: Request, exc: Exception
) -> JSONResponse:
    if not isinstance(exc, RequestValidationError):  # pragma: no cover
        return await _handle_unexpected_error(request, exc)
    return error_response(
        status_code=400,
        code=INVALID_REQUEST_CODE,
        message="The request is invalid.",
    )


async def _handle_http_exception(request: Request, exc: Exception) -> JSONResponse:
    if not isinstance(exc, StarletteHTTPException):  # pragma: no cover
        return await _handle_unexpected_error(request, exc)
    if exc.status_code == 404:
        code = PARCEL_NOT_FOUND_CODE
    else:
        code = INTERNAL_ERROR_CODE
    message = exc.detail if isinstance(exc.detail, str) else "The request could not be served."
    status_code = 404 if exc.status_code == 404 else exc.status_code
    if exc.status_code not in (404,):
        status_code = 500 if exc.status_code >= 500 else 400
    return error_response(status_code=status_code, code=code, message=message)


async def _handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error while serving %s %s", request.method, request.url.path)
    return error_response(
        status_code=500,
        code=INTERNAL_ERROR_CODE,
        message="An unexpected internal error occurred.",
    )
