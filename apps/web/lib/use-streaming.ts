"use client";

import { useEffect, useRef, useState } from "react";
import type { FlowStep, TextChunk } from "./mock-flows";

export function useStreaming(
  steps: FlowStep[],
  onComplete?: () => void,
) {
  const [progress, setProgress] = useState(0);
  const [streamText, setStreamText] = useState<Record<number, TextChunk[]>>({});
  const [toolStatuses, setToolStatuses] = useState<Record<number, string>>({});
  const [completed, setCompleted] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const delay = (ms: number) =>
      new Promise<void>((resolve) => {
        if (cancelled) { resolve(); return; }
        const id = setTimeout(() => resolve(), ms);
        // Store for cleanup
        const interval = setInterval(() => {
          if (cancelled) { clearTimeout(id); clearInterval(interval); resolve(); }
        }, 50);
        // Clear interval when timeout fires naturally
        setTimeout(() => clearInterval(interval), ms + 10);
      });

    async function run() {
      for (let i = 0; i < steps.length; i++) {
        if (cancelled) return;
        const step = steps[i];

        if (step.type === "thinking") {
          setProgress(i + 1);
          await delay(step.ms);
        } else if (step.type === "tool") {
          setToolStatuses((prev) => ({ ...prev, [i]: "running" }));
          setProgress(i + 1);
          await delay(step.delay);
          if (cancelled) return;
          setToolStatuses((prev) => ({ ...prev, [i]: step.finalStatus }));
          await delay(150);
        } else if (step.type === "stream") {
          setProgress(i + 1);
          for (let c = 0; c < step.chunks.length; c++) {
            if (cancelled) return;
            setStreamText((prev) => ({
              ...prev,
              [i]: [...(prev[i] || []), step.chunks[c]],
            }));
            await delay(80 + Math.random() * 80);
          }
        } else {
          // table, kpis, chart, draft-po
          setProgress(i + 1);
          await delay(280);
        }
      }

      if (cancelled) return;
      setCompleted(true);
      if (!completedRef.current && onComplete) {
        completedRef.current = true;
        onComplete();
      }
    }

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps]);

  return { progress, streamText, toolStatuses, completed };
}
