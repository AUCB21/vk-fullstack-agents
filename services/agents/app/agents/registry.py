"""Agent registry — maps agent IDs to their classes."""

from app.agents.inventory import InventoryAgent
from app.llm.provider import LLMProvider

AGENT_CLASSES = {
    "inventory": InventoryAgent,
}


def get_agent(agent_id: str, llm: LLMProvider):
    """Get an agent instance by ID. Raises KeyError if not found."""
    cls = AGENT_CLASSES.get(agent_id)
    if cls is None:
        raise KeyError(f"Unknown agent: {agent_id}")
    return cls(llm=llm)


def list_agents() -> list[dict[str, str]]:
    """List available agents with their IDs and descriptions."""
    return [
        {
            "id": "inventory",
            "name": "Inventory",
            "description": "Stock levels, item master, transfers",
        },
    ]
