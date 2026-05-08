"""Base agent class — thin loop over Anthropic SDK with tool-use."""

import json
import logging
from collections.abc import AsyncGenerator
from typing import Any

from app.llm.provider import EndEvent, LLMProvider, TextDelta, ToolCallRequest
from app.tools.base import Tool

logger = logging.getLogger(__name__)

MAX_ITERATIONS = 10


class AgentEvent:
    """Base class for events yielded by an agent run."""

    pass


class TextEvent(AgentEvent):
    def __init__(self, content: str):
        self.content = content


class ToolCallEvent(AgentEvent):
    def __init__(self, tool: str, input_data: dict[str, Any]):
        self.tool = tool
        self.input_data = input_data


class ToolResultEvent(AgentEvent):
    def __init__(self, tool: str, result: dict[str, Any]):
        self.tool = tool
        self.result = result


class ErrorEvent(AgentEvent):
    def __init__(self, message: str):
        self.message = message


class DoneEvent(AgentEvent):
    pass


class BaseAgent:
    """An agent that uses an LLM to answer questions by calling SAP tools."""

    system_prompt: str = ""
    tools: list[Tool] = []

    def __init__(self, llm: LLMProvider):
        self._llm = llm
        self._tool_map: dict[str, Tool] = {t.name: t for t in self.tools}

    def tool_definitions(self) -> list[dict[str, Any]]:
        return [t.tool_definition() for t in self.tools]

    async def run(
        self,
        message: str,
        history: list[dict[str, Any]],
        sap_client: Any,
    ) -> AsyncGenerator[AgentEvent, None]:
        """Run the agent loop. Yields events as the agent thinks and acts."""
        messages = [*history, {"role": "user", "content": message}]
        tool_defs = self.tool_definitions() or None

        for iteration in range(MAX_ITERATIONS):
            logger.info("Agent iteration %d", iteration + 1)

            async for event in self._llm.stream_chat(
                self.system_prompt, messages, tool_defs
            ):
                if isinstance(event, TextDelta):
                    yield TextEvent(event.content)

                elif isinstance(event, ToolCallRequest):
                    yield ToolCallEvent(event.name, event.input_data)

                    # Execute the tool
                    tool = self._tool_map.get(event.name)
                    if tool:
                        result = await tool.safe_execute(event.input_data, sap_client)
                    else:
                        result = {"error": f"Unknown tool: {event.name}"}

                    yield ToolResultEvent(event.name, result)

                    # Append assistant tool_use + tool result to messages for next iteration
                    messages.append({
                        "role": "assistant",
                        "content": [
                            {
                                "type": "tool_use",
                                "id": event.tool_id,
                                "name": event.name,
                                "input": event.input_data,
                            }
                        ],
                    })
                    messages.append({
                        "role": "user",
                        "content": [
                            {
                                "type": "tool_result",
                                "tool_use_id": event.tool_id,
                                "content": json.dumps(result),
                            }
                        ],
                    })

                elif isinstance(event, EndEvent):
                    yield DoneEvent()
                    return

        yield ErrorEvent("Max iterations reached")
