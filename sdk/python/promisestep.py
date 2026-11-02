"""PromiseStep public-reference API client. No private-record or write operations."""
from __future__ import annotations
import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

__version__ = "0.1.0-preview.1"
MAX_BYTES = 2_000_000
RESOURCES = frozenset({"health", "capabilities", "guidelines", "schemas", "openapi.json", "release"})

class PromiseStepError(Exception):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code

class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise PromiseStepError("UNEXPECTED_REDIRECT", "Redirects are not followed.")

class PublicAPIClient:
    def __init__(self, base_url: str = "https://promisestep.com/api/v1/", *, timeout: float = 10.0) -> None:
        try:
            parsed = urllib.parse.urlsplit(base_url)
            port = parsed.port
        except (ValueError, TypeError) as error:
            raise PromiseStepError("INVALID_INPUT", "Invalid base URL.") from error
        local = parsed.scheme == "http" and parsed.hostname in ("127.0.0.1", "localhost", "::1")
        if not ((parsed.scheme == "https" and parsed.hostname) or local) or parsed.username or parsed.password or parsed.query or parsed.fragment or not parsed.path.endswith("/"):
            raise PromiseStepError("INVALID_INPUT", "Use an HTTPS URL with a trailing slash and no credentials, query, or fragment.")
        if isinstance(timeout, bool) or not isinstance(timeout, (float, int)) or not 0 < timeout <= 60:
            raise PromiseStepError("INVALID_INPUT", "Timeout must be between 0 and 60 seconds.")
        self.base_url = base_url
        self.timeout = timeout
        self._opener = urllib.request.build_opener(_NoRedirect())

    def get(self, resource: str) -> Any:
        if not isinstance(resource, str) or resource not in RESOURCES:
            raise PromiseStepError("INVALID_INPUT", "Unknown public reference resource.")
        request = urllib.request.Request(urllib.parse.urljoin(self.base_url, resource), headers={"Accept": "application/json"}, method="GET")
        try:
            with self._opener.open(request, timeout=self.timeout) as response:
                if response.headers.get_content_type() != "application/json":
                    raise PromiseStepError("INVALID_RESPONSE", "Expected JSON, not an HTML fallback.")
                data = response.read(MAX_BYTES + 1)
                if len(data) > MAX_BYTES:
                    raise PromiseStepError("LIMIT_EXCEEDED", "Response exceeds the 2 MB limit.")
                try:
                    return json.loads(data.decode("utf-8"), parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x)))
                except (ValueError, UnicodeError) as error:
                    raise PromiseStepError("INVALID_RESPONSE", "Response is not valid JSON.") from error
        except urllib.error.HTTPError as error:
            raise PromiseStepError("HTTP_ERROR", f"Public reference API returned HTTP {error.code}.") from error
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            raise PromiseStepError("UNAVAILABLE", "The public reference API is unavailable; no write was attempted.") from error
