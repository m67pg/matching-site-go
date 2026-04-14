export async function generateStaticParams() {
  return [];
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSocket } from "@/components/providers/socket-provider";
import { ChevronLeft } from "lucide-react";

type Message = {
  id: number;
  SenderID: number;
  ReceiverID: number;
  Content: string;
  created_at: string;
};

export default function MessagePage() {
  const params = useParams();
  const router = useRouter();
  const partnerId = params?.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [partner, setPartner] = useState<{ username: string } | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { subscribe, isConnected, connectionVersion } = useSocket();

  const fetchChat = useCallback(async () => {
    if (!partnerId) {
      console.log("[DEBUG] ChatPage: partnerId is missing, skipping fetch.");
      return;
    }

    console.log(`[DEBUG] ChatPage: Fetching chat data for partnerId=${partnerId}...`);
    try {
      // 閾ｪ蛻・・ID繧貞叙蠕・      const meRes = await fetchApi("/api/me");
      setCurrentUserId(meRes.user.id);

      // 逶ｸ謇九・諠・ｱ繧貞叙蠕・      console.log(`[DEBUG] ChatPage: Fetching partner info from /api/users/${partnerId}`);
      const partnerRes = await fetchApi(`/api/users/${partnerId}`);
      setPartner(partnerRes.user);

      console.log(`[DEBUG] ChatPage: Fetching messages from /api/messages/${partnerId}`);
      const data = await fetchApi(`/api/messages/${partnerId}`);
      setMessages(data.messages || []);
    } catch (err: any) {
      console.error("[DEBUG] ChatPage ERROR:", err);
      setError(err.message || "Failed to fetch messages");
    }
  }, [partnerId]);

  useEffect(() => {
    fetchChat();
  }, [fetchChat]);

  // WebSocket 縺悟・謗･邯壹＆繧後◆髫帙↓繝・・繧ｿ繧貞・蜿門ｾ励☆繧・  useEffect(() => {
    if (connectionVersion > 1) {
      console.log("[DEBUG] ChatPage: Socket reconnected, re-fetching messages...");
      fetchChat();
    }
  }, [connectionVersion, fetchChat]);

  // WebSocket 縺ｫ繧医ｋ繝ｪ繧｢繝ｫ繧ｿ繧､繝蜿嶺ｿ｡縺ｮ險ｭ螳・  useEffect(() => {
    const unsubscribe = subscribe((data) => {
      console.log("[WS_DEBUG] ChatPage: Received event:", data);

      if (data.type === "new_message") {
        const msg = data.message as Message;
        const targetPartnerId = parseInt(partnerId, 10);

        // 蛻､螳壹Ο繧ｸ繝・け
        const isFromPartner = msg.SenderID === targetPartnerId;
        const isFromMeToPartner = msg.SenderID === currentUserId && msg.ReceiverID === targetPartnerId;

        console.log(`[WS_DEBUG] ID Check: msg.SenderID=${msg.SenderID}, currentUserId=${currentUserId}, partnerId=${targetPartnerId}`);

        if (isFromPartner || isFromMeToPartner) {
          setMessages((prev) => {
            // Case B: ID縺ｫ繧医ｋ驥崎､・メ繧ｧ繝・け
            const msgId = msg.id || (msg as any).ID; // JSON繧ｭ繝ｼ縺ｮ蟾ｮ逡ｰ繧定・・
            if (prev.some((m) => (m.id || (m as any).ID) === msgId)) {
              console.log("[WS_DEBUG] Duplicate message detected (ID match), ignoring.");
              return prev;
            }

            // Case A: 閾ｪ蛻・′騾∽ｿ｡縺励◆繝｡繝・そ繝ｼ繧ｸ縺ｯ handleSend 縺ｧ霑ｽ蜉貂医∩縺ｪ縺ｮ縺ｧ WebSocket 邨檎罰縺ｧ縺ｯ辟｡隕悶☆繧具ｼ井ｺ碁㍾陦ｨ遉ｺ髦ｲ豁｢・・            // 縺溘□縺励√ｂ縺・handleSend 縺ｧ縺ｮ霑ｽ蜉縺御ｽ輔ｉ縺九・逅・罰縺ｧ縺ｾ縺縺ｪ繧峨√％縺薙〒霑ｽ蜉縺吶ｋ
            if (msg.SenderID === currentUserId) {
              console.log("[WS_DEBUG] Self-sent message received via WS, skipping to avoid duplication.");
              return prev;
            }

            console.log("[WS_DEBUG] Appending new message to list.");
            return [...prev, msg];
          });
        }
      }
    });

    return () => unsubscribe();
  }, [partnerId, subscribe, currentUserId]);

  useEffect(() => {
    // 繧ｹ繧ｯ繝ｭ繝ｼ繝ｫ繧剃ｸ逡ｪ荳九∈・井ｾ晏ｭ倬・蛻励ｒ繝｡繝・そ繝ｼ繧ｸ縺悟｢励∴縺滓凾縺ｮ縺ｿ縺ｫ・・    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim()) return;

    const tempContent = content.trim();
    setContent(""); // 蜊ｳ蠎ｧ縺ｫ蜈･蜉帶ｬ・ｒ繧ｯ繝ｪ繧｢

    // 繝・く繧ｹ繝医お繝ｪ繧｢縺ｮ鬮倥＆繧偵Μ繧ｻ繝・ヨ
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const res = await fetchApi("/api/messages", {
        method: "POST",
        body: JSON.stringify({
          receiverId: parseInt(partnerId, 10),
          content: tempContent,
        }),
      });
      // API繝ｬ繧ｹ繝昴Φ繧ｹ謌仙粥譎ゅ↓繝ｪ繧ｹ繝医↓霑ｽ蜉
      setMessages((prev) => {
        const newMsg = res.message as Message;
        const msgId = newMsg.id || (newMsg as any).ID;
        if (prev.some((m) => (m.id || (m as any).ID) === msgId)) {
          return prev;
        }
        return [...prev, newMsg];
      });
    } catch (err: any) {
      alert(err.message || "Message send failed");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const adjustHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  // 繝｡繝・そ繝ｼ繧ｸ縺ｮ騾∽ｿ｡閠・′閾ｪ蛻・°縺ｩ縺・°縺ｮ蛻､螳・  const isMe = (msg: Message) => msg.SenderID === currentUserId;

  // 譌･譎ゅヵ繧ｩ繝ｼ繝槭ャ繝育畑縺ｮ繝倥Ν繝代・
  const formatFullDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const day = ["譌･", "譛・, "轣ｫ", "豌ｴ", "譛ｨ", "驥・, "蝨・][date.getDay()];
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');

    return `${y}/${m.toString().padStart(2, '0')}/${d.toString().padStart(2, '0')}(${day}) ${hh}:${mm}`;
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const day = ["譌･", "譛・, "轣ｫ", "豌ｴ", "譛ｨ", "驥・, "蝨・][date.getDay()];
    return `${y}蟷ｴ${m}譛・{d}譌･(${day})`;
  };

  const isNewDay = (msg: Message, prevMsg: Message | null) => {
    if (!prevMsg) return true;
    const d1 = new Date(msg.created_at || (msg as any).CreatedAt).toDateString();
    const d2 = new Date(prevMsg.created_at || (prevMsg as any).CreatedAt).toDateString();
    return d1 !== d2;
  };

  return (
    <div className="w-full max-w-5xl mx-auto h-screen flex flex-col bg-gray-50 md:border-x border-gray-100 shadow-sm relative">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 lg:px-12 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 transition-all">
        <div className="flex items-center">
          <Button variant="ghost" className="mr-3 p-2 h-10 w-10 rounded-full hover:bg-gray-100" onClick={() => router.push("/messages")}>
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-gray-900 leading-tight flex items-center tracking-tight">
              {partner?.username || "繝√Ε繝・ヨ"}
              <div
                className={`ml-2 w-3 h-3 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)] ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-300 shadow-none"}`}
                title={isConnected ? "謗･邯壻ｸｭ" : "蛻・妙荳ｭ"}
              />
            </h1>
            <span className={`text-[11px] mt-0.5 font-semibold tracking-wide ${isConnected ? "text-green-600" : "text-gray-400"}`}>
              {isConnected ? "繝ｻ繧ｪ繝ｳ繝ｩ繧､繝ｳ" : "繧ｪ繝輔Λ繧､繝ｳ"}
            </span>
          </div>
        </div>
      </header>

      {/* Message Area */}
      <ScrollArea className="flex-1 p-4 sm:p-6 lg:px-12 lg:py-10">
        {error && <div className="text-red-500 font-medium text-center mb-6 p-3 bg-red-50 rounded-lg border border-red-100">{error}</div>}

        <div className="space-y-6 pb-4 max-w-6xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-10 text-sm">
              縺ｾ縺繝｡繝・そ繝ｼ繧ｸ縺後≠繧翫∪縺帙ｓ縲・br />譛蛻昴・繝｡繝・そ繝ｼ繧ｸ繧帝√ｊ縺ｾ縺励ｇ縺・ｼ・            </div>
          ) : (
            messages.map((msg, index) => {
              const prevMsg = index > 0 ? messages[index - 1] : null;
              const showDateSeparator = isNewDay(msg, prevMsg);
              const msgId = msg.id || (msg as any).ID;

              return (
                <div key={msgId} className="space-y-4">
                  {showDateSeparator && (
                    <div className="flex justify-center my-6">
                      <span className="bg-zinc-200/50 text-zinc-600 text-[11px] font-bold px-4 py-1 rounded-full dark:bg-zinc-800 dark:text-zinc-400">
                        {formatDateSeparator(msg.created_at || (msg as any).CreatedAt)}
                      </span>
                    </div>
                  )}
                  <div
                    className={`flex ${isMe(msg) ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-5 py-3 shadow-md transition-all hover:shadow-lg ${isMe(msg)
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                        }`}
                    >
                      <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{msg.Content}</p>
                      <div
                        className={`text-[10px] mt-2 font-medium opacity-80 ${isMe(msg) ? "text-indigo-100 text-right" : "text-gray-400 text-left"
                          }`}
                      >
                        {formatFullDate(msg.created_at || (msg as any).CreatedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="bg-white/95 backdrop-blur-sm border-t border-gray-200 p-4 sm:p-6 lg:px-12 lg:py-8 sticky bottom-0">
        <div className="flex space-x-3 max-w-6xl mx-auto items-end">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="繝｡繝・そ繝ｼ繧ｸ繧貞・蜉・.."
            rows={1}
            className="flex-1 bg-zinc-100 border-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl px-4 py-3 resize-none min-h-[44px] transition-all overflow-hidden"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!content.trim()}
            className="bg-indigo-600 hover:bg-indigo-700 text-white transition-all h-[44px] px-6 rounded-2xl font-bold shadow-lg active:scale-95"
          >
            騾∽ｿ｡
          </Button>
        </div>
      </div>
    </div>
  );
}


