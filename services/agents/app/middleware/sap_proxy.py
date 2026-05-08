"""SAP-required proxy middleware.

All requests destined for SAP Service Layer must pass through this middleware.
It handles:
- Auth injection: attaches the SL session cookie to outgoing requests
- Session keep-alive: touches the session on every proxied request
- Request logging: logs all SL requests with path and timing
"""

import logging
import time
from collections.abc import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


class SAPProxyMiddleware(BaseHTTPMiddleware):
    """Ensures all SAP SL interactions are proxied with proper session context."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start = time.time()

        # Attach SAP session to request state if available
        sap_session = getattr(request.app.state, "sap_session", None)
        if sap_session is not None:
            request.state.sap_session = sap_session
            sap_session.touch()

        response = await call_next(request)

        elapsed_ms = (time.time() - start) * 1000
        logger.info(
            "SAP proxy: %s %s -> %s (%.1fms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )

        return response
