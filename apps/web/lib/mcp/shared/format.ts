const CHARACTER_LIMIT = 25_000;

export function truncateIfNeeded(text: string): string {
  if (text.length <= CHARACTER_LIMIT) return text;
  return (
    text.slice(0, CHARACTER_LIMIT) +
    `\n\n⚠️ Response truncated at ${CHARACTER_LIMIT} characters. Use pagination (offset/limit) to access remaining data.`
  );
}

export function mcpErrorResult(
  error: unknown,
  hint?: string,
): { content: Array<{ type: "text"; text: string }>; isError: boolean } {
  const message = error instanceof Error ? error.message : String(error);
  const text = hint ? `${message}\n\n${hint}` : message;
  return { content: [{ type: "text" as const, text }], isError: true };
}
