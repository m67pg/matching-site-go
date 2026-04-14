"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageSquare, MapPin } from "lucide-react";

interface ChatPartner {
  id: number;
  username: string;
  profile_image: string;
  location: string;
  latest_message: string;
}

export default function MessagesListPage() {
  const [partners, setPartners] = useState<ChatPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchApi("/api/chat-partners")
      .then((res) => {
        setPartners(res.partners || []);
      })
      .catch((err) => {
        console.error("Failed to fetch chat partners:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-indigo-600" />
          メッセージ
        </h1>
        <span className="text-sm text-zinc-500 font-medium bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
          {partners.length} 人のマッチング
        </span>
      </div>

      {partners.length === 0 ? (
        <Card className="border-dashed border-2 py-12 bg-zinc-50/50 dark:bg-zinc-900/20">
          <CardContent className="flex flex-col items-center text-center space-y-4">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-full">
              <Users className="w-10 h-10 text-zinc-400" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-bold text-zinc-800 dark:text-zinc-200">マッチングした相手がまだいません</p>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                ユーザー一覧から気になる人に「いいね」を送って、マッチングを目指しましょう！
              </p>
            </div>
            <Button 
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 font-bold px-8"
              onClick={() => router.push("/users")}
            >
              ユーザーを探しに行く
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {partners.map((partner) => (
            <Card 
              key={partner.id} 
              className="group cursor-pointer hover:border-indigo-200 hover:shadow-md transition-all active:scale-[0.99] border-zinc-100 dark:border-zinc-800 overflow-hidden"
              onClick={() => router.push(`/messages/${partner.id}`)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <Avatar className="w-14 h-14 border-2 border-transparent group-hover:border-indigo-100 transition-colors">
                  <AvatarImage src={partner.profile_image} />
                  <AvatarFallback className="bg-indigo-50 text-indigo-700 font-bold text-lg">
                    {partner.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h2 className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {partner.username}
                    </h2>
                    {partner.location && (
                      <span className="text-[10px] flex items-center gap-0.5 text-zinc-400 font-medium">
                        <MapPin className="w-3 h-3" />
                        {partner.location}
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">
                    {partner.latest_message ? (
                      partner.latest_message
                    ) : (
                      <span className="italic text-zinc-400">新しくマッチングしました！メッセージを送ってみましょう</span>
                    )}
                  </p>
                </div>
                
                <div className="text-zinc-300 group-hover:text-indigo-400 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Missing icons from previous check
import { Users, ChevronRight } from "lucide-react";
