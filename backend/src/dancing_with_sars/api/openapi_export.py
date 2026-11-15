"""Write the committed OpenAPI document from the running application.

Run from ``backend/``:

    uv run python -m dancing_with_sars.api.openapi_export

The committed ``docs/api/openapi.yaml`` is the authoritative HTTP contract; the
contract test fails when the application and that document disagree.
"""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

import yaml

from dancing_with_sars.main import create_app

DEFAULT_OUTPUT_PATH = Path(__file__).resolve().parents[4] / "docs" / "api" / "openapi.yaml"


def build_openapi_document() -> dict[str, Any]:
    """Build the OpenAPI document from the application configuration."""

    return create_app().openapi()


def write_openapi_document(path: Path = DEFAULT_OUTPUT_PATH) -> Path:
    """Serialize the OpenAPI document to YAML at ``path``."""

    document = build_openapi_document()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        yaml.safe_dump(document, sort_keys=False, allow_unicode=True),
        encoding="utf-8",
        newline="\n",
    )
    return path


def main(argv: list[str] | None = None) -> int:
    """Command-line entry point."""

    arguments = sys.argv[1:] if argv is None else argv
    output_path = Path(arguments[0]) if arguments else DEFAULT_OUTPUT_PATH
    written = write_openapi_document(output_path)
    print(f"Wrote OpenAPI document to {written}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
