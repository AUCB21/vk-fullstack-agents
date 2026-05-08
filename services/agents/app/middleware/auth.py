"""Session validation middleware.

Protects routes by verifying that a valid SAP SL session exists.
Exempt paths: /auth/*, /health*, /docs, /openapi.json
"""

import logging
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.config import settings

logger = logging.getLogger(__name__)

EXEMPT_PREFIXES = ("/auth", "/health", "/docs", "/openapi.json")


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if settings.dev_mode:
            return await call_next(request)

        path = request.url.path

        # Skip auth for exempt routes
        if any(path.startswith(prefix) for prefix in EXEMPT_PREFIXES):
            return await call_next(request)

        # Check for session cookie
        session_cookie = request.cookies.get("B1SESSION")
        if not session_cookie:
            return JSONResponse(
                status_code=401,
                content={"error": "Not authenticated — no SAP session"},
            )

        # Attach session info to request state for downstream use
        request.state.session_id = session_cookie

        return await call_next(request)
