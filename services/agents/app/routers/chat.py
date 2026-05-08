"""Chat router — POST /chat returns an SSE stream of agent events."""

import json
import logging
from typing import Any

from fastapi import APIRouter, Request
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.agents.base import (
    DoneEvent,
    ErrorEvent,
    TextEvent,
    ToolCallEvent,
    ToolResultEvent,
)
from app.agents.registry import get_agent
from app.llm.provider import LLMProvider
from app.sap.client import SAPClient

logger = logging.getLogger(__name__)

router = APIRouter(tags=["chat"])


class ChatRequest(BaseModel):
    agent_id: str
    message: str
    history: list[dict[str, Any]] = []
    model: str | None = None


@router.post("/chat")
async def chat(body: ChatRequest, request: Request):
    """Stream agent responses as Server-Sent Events."""

    async def event_stream():
        try:
            llm = LLMProvider(model=body.model)
            agent = get_agent(body.agent_id, llm)
        except KeyError as e:
            yield {"event": "error", "data": json.dumps({"error": str(e)})}
            return

        # Get SAP client from app state (set up by SAPProxyMiddleware / lifespan)
        sap_session = getattr(request.app.state, "sap_session", None)
        sap_client = SAPClient(sap_session) if sap_session else None

        try:
            async for event in agent.run(body.message, body.history, sap_client):
                if isinstance(event, TextEvent):
                    yield {
                        "event": "text_delta",
                        "data": json.dumps({"content": event.content}),
                    }
                elif isinstance(event, ToolCallEvent):
                    yield {
                        "event": "tool_call",
                        "data": json.dumps({
                            "tool": event.tool,
                            "input": event.input_data,
                        }),
                    }
                elif isinstance(event, ToolResultEvent):
                    yield {
                        "event": "tool_result",
                        "data": json.dumps({
                            "tool": event.tool,
                            "result": event.result,
                        }),
                    }
                elif isinstance(event, ErrorEvent):
                    yield {
                        "event": "error",
                        "data": json.dumps({"error": event.message}),
                    }
                elif isinstance(event, DoneEvent):
                    yield {"event": "done", "data": "{}"}
        except Exception as e:
            logger.exception("Chat stream error")
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)}),
            }

    return EventSourceResponse(event_stream())
