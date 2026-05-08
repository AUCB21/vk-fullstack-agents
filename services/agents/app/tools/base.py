"""Base tool class for SAP agent tools."""

import logging
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)


class Tool(ABC):
    """A tool that an agent can invoke. Each tool maps to a SAP SL operation."""

    name: str
    description: str
    parameters: dict[str, Any]
    required: list[str] | None = None

    def tool_definition(self) -> dict[str, Any]:
        """Return the Anthropic tool-use schema for this tool."""
        schema: dict[str, Any] = {
            "type": "object",
            "properties": self.parameters,
        }
        if self.required:
            schema["required"] = self.required

        return {
            "name": self.name,
            "description": self.description,
            "input_schema": schema,
        }

    @abstractmethod
    async def execute(self, input_data: dict[str, Any], sap_client: Any) -> dict[str, Any]:
        """Execute the tool with the given input. Returns result dict."""
        ...

    async def safe_execute(self, input_data: dict[str, Any], sap_client: Any) -> dict[str, Any]:
        """Execute with error handling. Returns error dict on failure."""
        if sap_client is None:
            return {
                "error": "SAP Service Layer is not connected. Cannot execute tool.",
                "tool": self.name,
            }
        try:
            return await self.execute(input_data, sap_client)
        except Exception as e:
            logger.error("Tool %s failed: %s", self.name, e)
            return {"error": str(e), "tool": self.name}
