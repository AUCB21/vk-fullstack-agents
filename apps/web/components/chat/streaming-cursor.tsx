export function StreamingCursor() {
  return (
    <span
      className="inline-block bg-[var(--dm-accent)]"
      style={{
        width: 7,
        height: 14,
        verticalAlign: -2,
        marginLeft: 2,
        animation: "blink 1s steps(2, end) infinite",
      }}
    />
  );
}
