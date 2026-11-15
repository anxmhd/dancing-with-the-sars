"""Small stdlib helpers for public STAC and temporary signed-asset access."""

from __future__ import annotations

import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def get_json(url: str) -> dict[str, Any]:
    request = Request(url, headers={"User-Agent": "dancing-with-the-sars/0.1"})
    try:
        with urlopen(request, timeout=30) as response:
            return json.load(response)
    except (HTTPError, URLError, TimeoutError) as error:
        raise RuntimeError(f"Could not read public catalog resource: {url}: {error}") from error


def signed_href(href: str, token: str) -> str:
    return f"{href}{'&' if '?' in href else '?'}{token}"
