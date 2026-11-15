"""Application configuration.

Configuration stays minimal: the only current choice is which scientific
provider the application wires behind the application/science interface.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from dataclasses import dataclass

from dancing_with_sars import __version__

SERVICE_NAME = "dancing-with-the-sars-backend"
SCIENCE_PROVIDER_ENV_VAR = "DWS_SCIENCE_PROVIDER"
DEFAULT_SCIENCE_PROVIDER = "mock"


@dataclass(frozen=True, slots=True)
class Settings:
    """Runtime settings resolved at application startup."""

    service_name: str = SERVICE_NAME
    version: str = __version__
    science_provider: str = DEFAULT_SCIENCE_PROVIDER

    @classmethod
    def from_environment(cls, environ: Mapping[str, str] | None = None) -> Settings:
        values = os.environ if environ is None else environ
        return cls(
            science_provider=values.get(
                SCIENCE_PROVIDER_ENV_VAR,
                DEFAULT_SCIENCE_PROVIDER,
            )
        )
