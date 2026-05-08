import logging

# pyrefly: ignore [missing-import]
import httpx

from app.sap.exceptions import SAPAuthError, SAPError, SAPNotFoundError, SAPValidationError
from app.sap.models import BusinessPartner, Item, ODataParams
from app.sap.session import SAPSession

logger = logging.getLogger(__name__)


class SAPClient:
    """Async client for SAP Service Layer CRUD operations.

    All requests go through the managed session which handles
    authentication and cookie management.
    """

    def __init__(self, session: SAPSession):
        self._session = session

    async def _request(
        self,
        method: str,
        path: str,
        params: dict | None = None,
        json: dict | None = None,
        retry_on_401: bool = True,
    ) -> dict | list:
        client = await self._session.get_client()
        self._session.touch()

        response = await client.request(method, path, params=params, json=json)

        # Auto-refresh on 401 and retry once
        if response.status_code == 401 and retry_on_401:
            logger.warning("SAP SL returned 401, session may be expired")
            raise SAPAuthError("Session expired — re-authentication required")

        self._handle_error(response)

        if response.status_code == 204:
            return {}
        return response.json()

    def _handle_error(self, response: httpx.Response) -> None:
        if response.is_success:
            return

        try:
            body = response.json()
            error_msg = body.get("error", {}).get("message", {}).get("value", str(body))
        except Exception:
            error_msg = response.text or f"HTTP {response.status_code}"

        if response.status_code == 404:
            raise SAPNotFoundError(message=error_msg)
        if response.status_code == 400:
            raise SAPValidationError(message=error_msg)
        raise SAPError(message=error_msg, status_code=response.status_code)

    # --- Items ---

    async def get_items(self, odata: ODataParams | None = None) -> list[Item]:
        params = odata.to_query_params() if odata else {}
        data = await self._request("GET", "/Items", params=params)
        items_raw = data.get("value", []) if isinstance(data, dict) else data
        return [Item.model_validate(item) for item in items_raw]

    async def get_item(self, item_code: str) -> Item:
        data = await self._request("GET", f"/Items('{item_code}')")
        return Item.model_validate(data)

    # --- Business Partners ---

    async def get_business_partners(
        self, odata: ODataParams | None = None
    ) -> list[BusinessPartner]:
        params = odata.to_query_params() if odata else {}
        data = await self._request("GET", "/BusinessPartners", params=params)
        bp_raw = data.get("value", []) if isinstance(data, dict) else data
        return [BusinessPartner.model_validate(bp) for bp in bp_raw]

    async def get_business_partner(self, card_code: str) -> BusinessPartner:
        data = await self._request("GET", f"/BusinessPartners('{card_code}')")
        return BusinessPartner.model_validate(data)
