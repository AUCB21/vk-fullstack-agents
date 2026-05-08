"""Inventory tools for the SAP Business One agent."""

from typing import Any

from app.sap.models import ODataParams
from app.tools.base import Tool


class GetItemsTool(Tool):
    name = "get_items"
    description = (
        "Query SAP B1 item master (OITM). Returns a list of items matching the OData filter. "
        "Use $filter for conditions like 'QuantityOnStock lt 10', $select to pick fields, "
        "$top to limit results, $orderby to sort."
    )
    parameters = {
        "filter": {
            "type": "string",
            "description": "OData $filter, e.g. 'QuantityOnStock lt 10'",
        },
        "select": {
            "type": "string",
            "description": "Comma-separated fields to return",
        },
        "top": {
            "type": "integer",
            "description": "Max rows to return (default 20)",
        },
        "orderby": {
            "type": "string",
            "description": "OData $orderby, e.g. 'QuantityOnStock asc'",
        },
    }

    async def execute(self, input_data: dict[str, Any], sap_client: Any) -> dict[str, Any]:
        odata = ODataParams(
            filter=input_data.get("filter"),
            select=input_data.get("select"),
            top=input_data.get("top", 20),
            orderby=input_data.get("orderby"),
        )
        items = await sap_client.get_items(odata)
        return {
            "count": len(items),
            "items": [item.model_dump(by_alias=True) for item in items],
        }


class GetItemDetailsTool(Tool):
    name = "get_item_details"
    description = (
        "Get full details for a single item by ItemCode from SAP B1 item master (OITM)."
    )
    parameters = {
        "item_code": {"type": "string", "description": "The ItemCode to look up, e.g. 'A0017'"},
    }
    required = ["item_code"]

    async def execute(self, input_data: dict[str, Any], sap_client: Any) -> dict[str, Any]:
        item = await sap_client.get_item(input_data["item_code"])
        return item.model_dump(by_alias=True)


class CheckStockLevelsTool(Tool):
    name = "check_stock_levels"
    description = (
        "Check stock levels for items below a given threshold. "
        "Returns items where QuantityOnStock is less than the specified minimum."
    )
    parameters = {
        "min_stock": {
            "type": "integer",
            "description": "Stock threshold. Items with QuantityOnStock below this are returned.",
        },
        "top": {"type": "integer", "description": "Max rows to return (default 20)"},
    }
    required = ["min_stock"]

    async def execute(self, input_data: dict[str, Any], sap_client: Any) -> dict[str, Any]:
        min_stock = int(input_data["min_stock"])  # Sanitize: force integer
        odata = ODataParams(
            filter=f"QuantityOnStock lt {min_stock}",
            select="ItemCode,ItemName,QuantityOnStock,QuantityOrderedFromVendors",
            top=input_data.get("top", 20),
            orderby="QuantityOnStock asc",
        )
        items = await sap_client.get_items(odata)
        return {
            "threshold": min_stock,
            "count": len(items),
            "items": [item.model_dump(by_alias=True) for item in items],
        }


INVENTORY_TOOLS: list[Tool] = [
    GetItemsTool(),
    GetItemDetailsTool(),
    CheckStockLevelsTool(),
]
