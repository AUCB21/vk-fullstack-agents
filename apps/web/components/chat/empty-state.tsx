"use client";

import { Package, ShoppingCart, Truck, Sparkles } from "lucide-react";
import { useChat } from "@/lib/chat-context";
import { AGENTS } from "@/lib/mock-data";
import { SUGGESTIONS } from "@/lib/mock-flows";
import { SuggestionCard } from "./suggestion-card";

const AGENT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  box: Package,
  cart: ShoppingCart,
  truck: Truck,
  sparkles: Sparkles,
};

export function EmptyState() {
  const { activeAgent, startFlow } = useChat();
  const agent = AGENTS.find((a) => a.id === activeAgent) ?? AGENTS[0];
  const suggestions = SUGGESTIONS[activeAgent] ?? [];
  const AgentIcon = AGENT_ICON_MAP[agent.icon] ?? Package;

  return (
    <div className="mx-auto flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-10" style={{ maxWidth: 820 }}>
      {/* Hero icon with outer ring */}
      <div className="relative mb-6">
        {/* Outer ring */}
        <div
          className="absolute rounded-[18px] border"
          style={{
            inset: -6,
            borderColor: "oklch(from var(--dm-accent) l c h / 0.15)",
          }}
        />
        {/* Inner box */}
        <div
          className="relative flex size-14 items-center justify-center rounded-[14px] bg-[var(--dm-accent-soft)] border"
          style={{
            borderColor: "oklch(from var(--dm-accent) l c h / 0.3)",
          }}
        >
          <AgentIcon className="size-6 text-[var(--dm-accent)]" />
        </div>
      </div>

      {/* Title */}
      <h1
        className="mb-3 text-center text-xl font-medium sm:text-2xl"
        style={{
          letterSpacing: "-0.02em",
          textWrap: "balance",
          maxWidth: 560,
        }}
      >
        &iquest;Que te gustaria hacer con {agent.name.toLowerCase()}?
      </h1>

      {/* Description */}
      <p
        className="mb-8 text-center text-sm text-[var(--text-muted)]"
        style={{ maxWidth: 480 }}
      >
        {agent.desc}. Pregunt&aacute; en lenguaje natural &mdash; el agente consulta SAP B1 directamente y muestra su trabajo.
      </p>

      {/* Suggestion grid */}
      <div className="mb-8 grid w-full grid-cols-1 gap-2 sm:grid-cols-2" style={{ maxWidth: 640 }}>
        {suggestions.map((s) => (
          <SuggestionCard
            key={s.flow + s.label}
            label={s.label}
            query={s.q}
            icon={s.icon}
            onClick={() => startFlow(s.flow, s.q)}
          />
        ))}
      </div>

    </div>
  );
}
