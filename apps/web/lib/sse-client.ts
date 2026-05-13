/**
 * SSE client for consuming FastAPI agent streams.
 *
 * Parses Server-Sent Events from the /api/agents/chat endpoint
 * into typed callback invocations.
 */

export type SSECallbacks = {
  onTextDelta?: (content: string) => void;
  onToolCall?: (tool: string, input: Record<string, unknown>) => void;
  onToolResult?: (tool: string, result: Record<string, unknown>) => void;
  onError?: (error: string) => void;
  onDone?: () => void;
};

export type ChatPayload = {
  agent_id: string;
  message: string;
  history: Array<Record<string, unknown>>;
  model?: string;
};

export async function streamChat(
  payload: ChatPayload,
  callbacks: SSECallbacks,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch("/api/agents/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    const text = await response.text();
    callbacks.onError?.(text || `HTTP ${response.status}`);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    callbacks.onError?.("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE lines from buffer
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    let currentEvent = "";

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ")) {
        const data = line.slice(6);
        handleEvent(currentEvent, data, callbacks);
        currentEvent = "";
      }
    }
  }
}

function handleEvent(
  event: string,
  rawData: string,
  callbacks: SSECallbacks,
): void {
  try {
    const data = JSON.parse(rawData);

    switch (event) {
      case "text_delta":
        callbacks.onTextDelta?.(data.content);
        break;
      case "tool_call":
        callbacks.onToolCall?.(data.tool, data.input);
        break;
      case "tool_result":
        callbacks.onToolResult?.(data.tool, data.result);
        break;
      case "error":
        callbacks.onError?.(data.error);
        break;
      case "done":
        callbacks.onDone?.();
        break;
    }
  } catch {
    callbacks.onError?.(`Failed to parse SSE data: ${rawData}`);
  }
}
