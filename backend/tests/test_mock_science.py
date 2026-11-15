from __future__ import annotations

from datetime import date

from dancing_with_sars.application.mock_parcels import (
    SYNTHETIC_PARCEL_IDS,
    SyntheticParcelCatalog,
)
from dancing_with_sars.application.mock_science import MockScienceGateway
from dancing_with_sars.application.result_validation import normalize_result
from dancing_with_sars.application.science_contract import ScienceRequest
from dancing_with_sars.domain.vegetation import (
    QualityStatus,
    ResultStatus,
    VegetationIndex,
)


def _request(
    parcel_id: str = "synthetic-parcel-001",
    start: date = date(2025, 1, 1),
    end: date = date(2025, 3, 31),
) -> ScienceRequest:
    return ScienceRequest(
        parcel_id=parcel_id,
        parcel_geometry={"type": "Polygon", "coordinates": []},
        parcel_crs="synthetic-crs",
        start_date=start,
        end_date=end,
        index=VegetationIndex.NDVI,
    )


def test_mock_provider_is_deterministic() -> None:
    gateway = MockScienceGateway()

    first = gateway.fetch_ndvi_series(_request())
    second = gateway.fetch_ndvi_series(_request())

    assert first == second


def test_mock_provider_marks_results_as_synthetic() -> None:
    result = MockScienceGateway().fetch_ndvi_series(_request())

    assert result.provenance.provider.startswith("Synthetic source")
    assert "Synthetic" in result.provenance.dataset_name
    assert result.provenance.processing_software == "synthetic-processor/0.1.0"
    assert result.provenance.external_product_ids is None
    assert all(
        observation.observation_id.startswith("synthetic-") for observation in result.observations
    )


def test_mock_provider_only_returns_values_for_accepted_observations() -> None:
    result = MockScienceGateway().fetch_ndvi_series(_request())

    for observation in result.observations:
        if observation.quality.status is QualityStatus.ACCEPTED:
            assert observation.value is not None
        else:
            assert observation.value is None
            assert observation.quality.reasons


def test_mock_provider_filters_by_requested_range() -> None:
    result = MockScienceGateway().fetch_ndvi_series(
        _request(start=date(2025, 2, 1), end=date(2025, 2, 28))
    )

    assert [item.observation_date for item in result.observations] == [date(2025, 2, 15)]


def test_mock_provider_reports_empty_and_no_valid_states() -> None:
    gateway = MockScienceGateway()

    assert (
        gateway.fetch_ndvi_series(_request("synthetic-parcel-002")).result_status
        is ResultStatus.NO_OBSERVATIONS
    )
    assert (
        gateway.fetch_ndvi_series(_request("synthetic-parcel-003")).result_status
        is ResultStatus.NO_VALID_OBSERVATIONS
    )


def test_result_validation_accepts_mock_output() -> None:
    result = normalize_result(
        MockScienceGateway().fetch_ndvi_series(_request()),
        start_date=date(2025, 1, 1),
        end_date=date(2025, 3, 31),
    )

    assert result.result_status is ResultStatus.AVAILABLE


def test_synthetic_catalog_only_knows_documented_parcels() -> None:
    catalog = SyntheticParcelCatalog()

    for parcel_id in SYNTHETIC_PARCEL_IDS:
        reference = catalog.find_parcel(parcel_id)
        assert reference is not None
        assert reference.crs == "synthetic-crs"

    assert catalog.find_parcel("unknown-parcel") is None
