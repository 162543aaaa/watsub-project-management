import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Message = {
  role: "assistant",
  content: "สวัสดีครับ! ผม Watsub AI พร้อมช่วยตอบคำถามเกี่ยวกับงาน tasks, projects, หรือสิ่งที่อยากรู้ครับ 😊",
};

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg: Message = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setIsTyping(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/admin-users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token ?? ""}`,
          "apikey": anonKey,
        },
        body: JSON.stringify({
          action: "chat-with-data",
          messages: next,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`HTTP ${res.status}: ${body}`);
      }

      const json = await res.json();
      const reply: string = json.reply ?? "ขออภัย ไม่สามารถตอบได้ในขณะนี้ครับ";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `เกิดข้อผิดพลาด: ${e instanceof Error ? e.message : "Unknown error"}` },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* ── Floating toggle button ─────────────────────────────────────── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI chat" : "Open AI chat"}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
        style={{
          background: open
            ? "hsl(222 47% 16%)"
            : "linear-gradient(135deg, hsl(191 91% 37%), hsl(191 91% 28%))",
          boxShadow: "0 8px 32px hsl(191 91% 37% / 0.45)",
        }}
      >
        {open ? (
          <X className="w-5 h-5 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* ── Chat window ───────────────────────────────────────────────── */}
      <div
        className={`fixed bottom-24 right-5 z-50 w-[360px] max-w-[calc(100vw-2.5rem)] transition-all duration-300 origin-bottom-right ${
          open
            ? "opacity-100 scale-100 pointer-events-auto"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <Card
          className="flex flex-col overflow-hidden border-0"
          style={{
            background: "hsl(222 47% 10%)",
            boxShadow: "0 24px 64px hsl(0 0% 0% / 0.6), 0 4px 24px hsl(191 91% 37% / 0.15)",
            height: 480,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0"
            style={{
              background: "linear-gradient(90deg, hsl(191 91% 28% / 0.3), hsl(222 47% 12%))",
              borderBottom: "1px solid hsl(222 47% 18%)",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "hsl(191 91% 37% / 0.2)" }}
            >
              <Bot className="w-4 h-4" style={{ color: "hsl(191 91% 65%)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-white leading-tight">Watsub AI</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: "hsl(142 72% 50%)" }}
                />
                <span className="text-[10px]" style={{ color: "hsl(215 20% 55%)" }}>
                  Online
                </span>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ color: "hsl(215 20% 55%)" }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 px-3 py-3">
            <div className="flex flex-col gap-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
                      style={{ background: "hsl(191 91% 37% / 0.2)" }}
                    >
                      <Bot className="w-3 h-3" style={{ color: "hsl(191 91% 65%)" }} />
                    </div>
                  )}
                  <div
                    className="max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words"
                    style={
                      msg.role === "user"
                        ? {
                            background: "hsl(191 91% 37%)",
                            color: "#fff",
                            borderBottomRightRadius: 4,
                          }
                        : {
                            background: "hsl(222 47% 16%)",
                            color: "hsl(215 20% 85%)",
                            border: "1px solid hsl(222 47% 22%)",
                            borderBottomLeftRadius: 4,
                          }
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-end gap-2 justify-start">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mb-0.5"
                    style={{ background: "hsl(191 91% 37% / 0.2)" }}
                  >
                    <Bot className="w-3 h-3" style={{ color: "hsl(191 91% 65%)" }} />
                  </div>
                  <div
                    className="px-4 py-3 rounded-2xl flex items-center gap-1.5"
                    style={{
                      background: "hsl(222 47% 16%)",
                      border: "1px solid hsl(222 47% 22%)",
                      borderBottomLeftRadius: 4,
                    }}
                  >
                    {[0, 1, 2].map((d) => (
                      <span
                        key={d}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{
                          background: "hsl(215 20% 55%)",
                          animationDelay: `${d * 150}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div
            className="flex items-center gap-2 px-3 py-3 flex-shrink-0"
            style={{ borderTop: "1px solid hsl(222 47% 18%)" }}
          >
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="พิมพ์ข้อความ…"
              disabled={isTyping}
              className="flex-1 text-sm border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
              style={{
                background: "hsl(222 47% 14%)",
                border: "1px solid hsl(222 47% 22%)",
                borderRadius: 12,
                color: "hsl(215 20% 90%)",
              }}
            />
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!input.trim() || isTyping}
              className="flex-shrink-0 w-9 h-9 rounded-xl disabled:opacity-40 transition-all"
              style={{ background: "hsl(191 91% 37%)", color: "#fff" }}
              aria-label="Send"
            >
              {isTyping ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
