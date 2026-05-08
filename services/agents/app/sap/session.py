import logging
import ssl
import time

import httpx

from app.config import settings
from app.sap.exceptions import SAPAuthError

logger = logging.getLogger(__name__)


class SAPSession:
    """Manages a single SAP Service Layer session with auto-refresh."""

    def __init__(self):
        self._session_id: str | None = None
        self._cookies: httpx.Cookies = httpx.Cookies()
        self._last_activity: float = 0
        self._client: httpx.AsyncClient | None = None
        self._last_username: str | None = None
        self._last_password: str | None = None

    def _build_ssl_context(self) -> ssl.SSLContext | bool:
        if not settings.sap_sl_verify_ssl:
            return False
        return True

    async def get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=settings.sap_sl_base_url,
                verify=self._build_ssl_context(),
                timeout=httpx.Timeout(30.0),
                cookies=self._cookies,
            )
        return self._client

    @property
    def is_expired(self) -> bool:
        if self._session_id is None:
            return True
        elapsed = time.time() - self._last_activity
        return elapsed > settings.sap_sl_session_timeout

    async def login(self, username: str, password: str) -> str:
        client = await self.get_client()
        payload = {
            "CompanyDB": settings.sap_sl_company_db,
            "UserName": username,
            "Password": password,
        }
        response = await client.post("/Login", json=payload)
        if response.status_code != 200:
            error_detail = {}
            try:
                error_detail = response.json()
            except (ValueError, TypeError):
                logger.warning("Could not parse SAP login error response")
            raise SAPAuthError(
                message=f"SAP login failed: {response.status_code}",
                detail=error_detail,
            )

        body = response.json()
        session_id = body.get("SessionId")
        if not session_id:
            raise SAPAuthError(message="SAP login returned no SessionId")

        self._session_id = session_id
        self._cookies = response.cookies
        self._last_activity = time.time()
        self._last_username = username
        self._last_password = password

        # Update client cookies for subsequent requests
        if self._client:
            self._client.cookies = self._cookies

        logger.info("SAP SL session established: %s", self._session_id)
        return self._session_id

    async def logout(self) -> None:
        if self._session_id is None:
            return
        try:
            client = await self.get_client()
            await client.post("/Logout")
            logger.info("SAP SL session terminated: %s", self._session_id)
        except Exception:
            logger.warning("Failed to logout SAP SL session: %s", self._session_id)
        finally:
            self._session_id = None
            self._cookies = httpx.Cookies()
            self._last_activity = 0

    def touch(self) -> None:
        """Update last activity timestamp."""
        self._last_activity = time.time()

    async def close(self) -> None:
        await self.logout()
        if self._client:
            await self._client.aclose()
            self._client = None
