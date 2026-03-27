"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { chatService } from "@/services/chat.service";
import type { ChatMessage } from "@/types";

export function useTripChat(tripId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!tripId) return;
    setIsLoading(true);
    chatService
      .getHistory(tripId)
      .then(setMessages)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [tripId]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!tripId || isStreaming) return;

      const now = new Date().toISOString();

      // Optimistically add user message
      const userMsg: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        trip_id: tripId,
        user_id: "",
        role: "user",
        content,
        created_at: now,
      };

      // Add user message + empty assistant placeholder
      const assistantMsg: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        trip_id: tripId,
        user_id: "",
        role: "assistant",
        content: "",
        created_at: now,
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsStreaming(true);

      try {
        const body = await chatService.sendMessageStream(tripId, content);
        if (!body) throw new Error("No response body");

        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6).trim();
            if (!raw) continue;

            try {
              const data = JSON.parse(raw);

              if (data.content) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: last.content + data.content,
                    };
                  }
                  return updated;
                });
              }

              if (data.done && data.message_id) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      id: data.message_id,
                    };
                  }
                  return updated;
                });
              }

              if (data.error) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  if (last && last.role === "assistant") {
                    updated[updated.length - 1] = {
                      ...last,
                      content: `Error: ${data.error}`,
                    };
                  }
                  return updated;
                });
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } catch (err) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              content: `Error: ${err instanceof Error ? err.message : "Something went wrong"}`,
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
      }
    },
    [tripId, isStreaming]
  );

  const clearHistory = useCallback(async () => {
    if (!tripId) return;
    await chatService.clearHistory(tripId);
    setMessages([]);
  }, [tripId]);

  return { messages, isLoading, isStreaming, sendMessage, clearHistory };
}
