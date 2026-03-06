import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Loader2 } from "lucide-react";

interface MemoChatPanelProps {
  memoId: string;
}

export function MemoChatPanel({ memoId }: MemoChatPanelProps) {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/memos", memoId, "chat"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const sendMessage = useMutation({
    mutationFn: async (msg: string) => {
      const res = await apiRequest("POST", `/api/memos/${memoId}/chat`, { message: msg });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/memos", memoId, "chat"] });
      queryClient.invalidateQueries({ queryKey: ["/api/memos", memoId] });
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || sendMessage.isPending) return;
    sendMessage.mutate(message);
    setMessage("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-3 border-b">
        <h3 className="font-medium">Refine Memo with AI</h3>
        <p className="text-xs text-muted-foreground">
          Ask questions about the analysis, request changes to sections, or explore scenarios.
        </p>
      </div>

      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-4">
          {(messages as any[]).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Bot className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Start a conversation to refine your investor memo.</p>
              <div className="mt-4 space-y-2">
                {[
                  "Strengthen the bull case in the investment merits section",
                  "Add more detail on regulatory risks",
                  "How does the valuation compare to recent transactions?",
                  "What are the key Sentinel synergies for this deal?",
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setMessage(suggestion);
                      sendMessage.mutate(suggestion);
                    }}
                    className="block w-full text-left text-sm px-4 py-2 rounded-md bg-muted hover:bg-muted/80 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {(messages as any[]).map((msg: any, i: number) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
              </div>
              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {sendMessage.isPending && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg px-4 py-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}

          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="px-6 py-3 border-t">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Ask about the memo or request changes..."
            disabled={sendMessage.isPending}
          />
          <Button onClick={handleSend} disabled={!message.trim() || sendMessage.isPending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
