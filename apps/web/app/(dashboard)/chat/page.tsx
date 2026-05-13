"use client";

import { useEffect } from "react";
import { useChat } from "@/lib/chat-context";
import { EmptyState } from "@/components/chat/empty-state";
import { MessageThread } from "@/components/chat/message-thread";
import { ChatInput } from "@/components/chat/chat-input";
import { CitationPopover } from "@/components/chat/citation";
import { AGENTS } from "@/lib/mock-data";

export default function ChatPage() {
  const { conversation, citation, activeAgent } = useChat();

  // Dynamic page title
  useEffect(() => {
    const agent = AGENTS.find((a) => a.id === activeAgent);
    document.title = `VK Agents — ${agent?.name || "Chat"}`;
  }, [activeAgent]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {conversation.length === 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <EmptyState />
        </div>
      ) : (
        <MessageThread />
      )}

      <ChatInput />

      <CitationPopover data={citation} />
    </div>
  );
}
