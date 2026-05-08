"""Anthropic SDK wrapper for chat, streaming, and tool-use."""

import logging
from collections.abc import AsyncGenerator
from typing import Any

import anthropic

from app.config import settings

logger = logging.getLogger(__name__)


class LLMEvent:
    """Base class for streaming events from the LLM."""

    pass


class TextDelta(LLMEvent):
    def __init__(self, content: str):
        self.content = content


class ToolCallRequest(LLMEvent):
    def __init__(self, tool_id: str, name: str, input_data: dict[str, Any]):
        self.tool_id = tool_id
        self.name = name
        self.input_data = input_data


class EndEvent(LLMEvent):
    pass


class LLMProvider:
    """Wraps Anthropic Python SDK for streaming chat with tool-use."""

    def __init__(self, model: str | None = None):
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is not set")
        self._client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self._model = model or settings.llm_model

    async def stream_chat(
        self,
        system_prompt: str,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
    ) -> AsyncGenerator[LLMEvent, None]:
        """Stream a chat completion, yielding text deltas and tool call requests."""
        kwargs: dict[str, Any] = {
            "model": self._model,
            "max_tokens": 4096,
            "system": system_prompt,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools

        async with self._client.messages.stream(**kwargs) as stream:
            async for event in stream:
                if event.type == "content_block_delta":
                    if event.delta.type == "text_delta":
                        yield TextDelta(event.delta.text)

            # After stream completes, check for tool use in the final message
            response = await stream.get_final_message()

            for block in response.content:
                if block.type == "tool_use":
                    yield ToolCallRequest(
                        tool_id=block.id,
                        name=block.name,
                        input_data=block.input,
                    )

            # If no tool calls, signal end
            has_tool_calls = any(b.type == "tool_use" for b in response.content)
            if not has_tool_calls:
                yield EndEvent()
