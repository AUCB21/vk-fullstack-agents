"""Tool definition builder for Anthropic tool-use format."""

from typing import Any


def tool_def(
    name: str,
    description: str,
    parameters: dict[str, Any],
    required: list[str] | None = None,
) -> dict[str, Any]:
    """Build a tool definition in Anthropic's expected format."""
    schema: dict[str, Any] = {
        "type": "object",
        "properties": parameters,
    }
    if required:
        schema["required"] = required

    return {
        "name": name,
        "description": description,
        "input_schema": schema,
    }


def string_param(description: str) -> dict[str, str]:
    return {"type": "string", "description": description}


def int_param(description: str) -> dict[str, str]:
    return {"type": "integer", "description": description}
