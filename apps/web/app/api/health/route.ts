export async function GET() {
  // Check that the Anthropic API key is configured so the frontend knows live mode can work.
  const llmConfigured = !!process.env.ANTHROPIC_API_KEY;

  return Response.json({
    status: "ok",
    agents_service: llmConfigured ? "ok" : "unreachable",
  });
}
