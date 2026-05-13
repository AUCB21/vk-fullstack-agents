"use client";

import { useEffect, useRef } from "react";
import { useChat } from "@/lib/chat-context";
import { UserMessageBubble } from "./user-message";
import { AssistantMessageBubble } from "./assistant-message";
import { LiveAssistantMessageBubble } from "./live-assistant-message";

export function MessageThread() {
  const { conversation, busy } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [conversation, busy]);

  return (
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-[820px] flex-col gap-5 px-3 pb-6 pt-6 sm:gap-7 sm:px-6 sm:pt-8">
        {conversation.map((msg, i) => {
          if (msg.role === "user") {
            return <UserMessageBubble key={i} message={msg} />;
          }
          if (msg.role === "live-assistant") {
            return <LiveAssistantMessageBubble key={msg.key} message={msg} />;
          }
          return <AssistantMessageBubble key={msg.key} message={msg} />;
        })}
      </div>
    </div>
  );
}
