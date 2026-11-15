"""Application service orchestrating the parcel NDVI time-series workflow."""

from __future__ import annotations

from datetime import date

from dancing_with_sars.application.errors import (
    ErrorDetail,
    InvalidDateRangeError,
    ParcelNotFoundError,
    ProcessingFailedError,
    SourceUnavailableError,
    UnsupportedIndexError,
)
from dancing_with_sars.application.result_validation import normalize_result
from dancing_with_sars.application.science_contract import (
    ParcelCatalog,
    ScienceError,
    ScienceProcessingError,
    ScienceRequest,
    ScienceSourceUnavailableError,
    VegetationScienceGateway,
)
from dancing_with_sars.domain.vegetation import (
    VegetationIndex,
    VegetationSeriesResult,
)


class VegetationSeriesService:
    """Validates a parcel time-series request and coordinates the science call."""

    def __init__(
        self,
        *,
        parcel_catalog: ParcelCatalog,
        science: VegetationScienceGateway,
    ) -> None:
        self._parcel_catalog = parcel_catalog
        self._science = science

    def get_series(
        self,
        *,
        parcel_id: str,
        start_date: date,
        end_date: date,
        index: str,
    ) -> VegetationSeriesResult:
        """Return the parcel series or raise a typed application error."""

        if end_date < start_date:
            raise InvalidDateRangeError(
                "The end date must not precede the start date.",
                details=(
                    ErrorDetail(
                        message="End date precedes start date.",
                        field_path="endDate",
                        code="DATE_ORDER",
                    ),
                ),
            )
        try:
            requested_index = VegetationIndex(index)
        except ValueError as error:
            raise UnsupportedIndexError(
                "Only the NDVI index is supported for this workflow.",
                details=(
                    ErrorDetail(
                        message=f"Unsupported index {index!r}.",
                        field_path="index",
                        code="UNSUPPORTED_VALUE",
                    ),
                ),
            ) from error

        parcel = self._parcel_catalog.find_parcel(parcel_id)
        if parcel is None:
            raise ParcelNotFoundError(
                "No parcel exists for the supplied identifier.",
                details=(
                    ErrorDetail(
                        message="Unknown internal parcel identifier.",
                        field_path="parcelId",
                        code="UNKNOWN_PARCEL",
                    ),
                ),
            )

        request = ScienceRequest(
            parcel_id=parcel.parcel_id,
            parcel_geometry=parcel.geometry,
            parcel_crs=parcel.crs,
            start_date=start_date,
            end_date=end_date,
            index=requested_index,
        )
        try:
            result = self._science.fetch_ndvi_series(request)
        except ScienceSourceUnavailableError as error:
            raise SourceUnavailableError(
                "The scientific data source is currently unavailable.",
            ) from error
        except ScienceProcessingError as error:
            raise ProcessingFailedError(
                "The scientific processing step failed.",
            ) from error
        except ScienceError as error:
            raise ProcessingFailedError(
                "The scientific processing step failed.",
            ) from error

        return normalize_result(result, start_date=start_date, end_date=end_date)
