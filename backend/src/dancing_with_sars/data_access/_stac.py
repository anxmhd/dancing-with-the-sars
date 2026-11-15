"""Small stdlib helpers for public STAC and temporary signed-asset access."""

from __future__ import annotations

import json
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def get_json(url: str, *, retries: int = 5) -> dict[str, Any]:
    request = Request(url, headers={"User-Agent": "dancing-with-the-sars/0.1"})
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            with urlopen(request, timeout=30) as response:
                return json.load(response)
        except HTTPError as error:
            last_error = error
            if error.code == 429 and attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"Could not read public catalog resource: {url}: {error}") from error
        except (URLError, TimeoutError) as error:
            last_error = error
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"Could not read public catalog resource: {url}: {error}") from error
    raise RuntimeError(f"Could not read public catalog resource: {url}: {last_error}")


def signed_href(href: str, token: str) -> str:
    return f"{href}{'&' if '?' in href else '?'}{token}"


def search_items(
    base_url: str,
    collection: str,
    bbox: tuple[float, float, float, float],
    start_date: str,
    end_date: str,
    *,
    limit: int = 100,
    query: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    """Search a STAC API by collection, bounding box, and inclusive date range."""
    body: dict[str, Any] = {
        "collections": [collection],
        "bbox": [bbox[0], bbox[1], bbox[2], bbox[3]],
        "datetime": f"{start_date}T00:00:00Z/{end_date}T23:59:59Z",
        "limit": limit,
    }
    if query:
        body["query"] = query
    request = Request(
        f"{base_url.rstrip('/')}/search",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "User-Agent": "dancing-with-the-sars/0.1"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=60) as response:
            payload = json.load(response)
    except (HTTPError, URLError, TimeoutError) as error:
        raise RuntimeError(f"Could not search STAC collection {collection}: {error}") from error
    return list(payload.get("features", []))
