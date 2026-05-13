"use client";

import { use } from "react";
import { BuilderProvider } from "@/lib/builder/builder-context";
import { BuilderLayout } from "@/components/builder/builder-layout";

export default function BuilderPage({
  params,
}: {
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = use(params);

  return (
    <BuilderProvider agentId={agentId}>
      <BuilderLayout />
    </BuilderProvider>
  );
}
