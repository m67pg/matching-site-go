"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface User {
  ID: number;
  Username: string;
  ProfileImage: string;
  Bio: string;
}

interface ChatPartner {
  id: number;
  username: string;
  profile_image: string;
  latest_message: string;
}

export default function Home() {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [featuredUsers, setFeaturedUsers] = useState<User[]>([]);
  const [recentPartners, setRecentPartners] = useState<ChatPartner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authStatus = isAuthenticated();
    setLoggedIn(authStatus);

    if (authStatus) {
      Promise.all([
        fetchApi("/api/users").catch(() => ({ users: [] })),
        fetchApi("/api/chat-partners").catch(() => ({ partners: [] }))
      ]).then(([usersRes, partnersRes]) => {
        const allUsers = usersRes.users || [];
        const shuffled = [...allUsers].sort(() => 0.5 - Math.random());
        setFeaturedUsers(shuffled.slice(0, 3));

        setRecentPartners((partnersRes.partners || []).slice(0, 3));
      }).finally(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loggedIn === null || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm font-medium text-gray-500">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!loggedIn) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-zinc-900 dark:to-zinc-950 p-6 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-indigo-900 dark:text-indigo-100 mb-6 drop-shadow-sm">
          理想のパートナーを見つけよう
        </h1>
        <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-300 max-w-3xl mb-10 leading-relaxed">
          マッチングサイトは、共通の趣味や価値観を持つ人と出会うための新しいプラットフォームです。今すぐ登録して、新しいつながりを作りましょう。
        </p>
        <Button size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-10 py-6 text-lg font-bold shadow-lg transition-transform hover:scale-105" onClick={() => router.push("/login")}>
          ログインして始める
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-8 w-full">
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">ダッシュボード</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Quick Links */}
        <Card className="col-span-1 md:col-span-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none shadow-md">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold mb-2 drop-shadow-sm">プロフィールを充実させる</h2>
              <p className="text-indigo-100">自己紹介や写真を更新して、マッチング率をアップさせましょう！</p>
            </div>
            <Button variant="secondary" className="whitespace-nowrap font-bold hover:bg-white/90" size="lg" onClick={() => router.push("/profile")}>
              プロフィール編集
            </Button>
          </CardContent>
        </Card>

        {/* Featured Users */}
        <Card className="col-span-1 md:col-span-2 shadow-sm border-gray-100 dark:border-zinc-800">
          <CardHeader>
            <CardTitle className="text-xl">注目のユーザー</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col h-full justify-between">
            {featuredUsers.length === 0 ? (
              <p className="text-zinc-500 text-center py-10">ユーザーがまだいません。</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {featuredUsers.map(user => (
                  <div key={user.ID} className="flex flex-col items-center p-5 border border-gray-100 rounded-xl hover:bg-indigo-50/50 hover:border-indigo-100 cursor-pointer transition-all hover:shadow-md" onClick={() => router.push("/users")}>
                    <Avatar className="w-20 h-20 mb-4 border-2 border-white shadow-sm ring-2 ring-indigo-50">
                      <AvatarImage src={user.ProfileImage} />
                      <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl font-bold">{user.Username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-zinc-800 truncate w-full text-center">{user.Username}</span>
                    <span className="text-xs text-zinc-500 truncate w-full text-center mt-1">{user.Bio || "よろしくお願いします"}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-2">
              <Button variant="outline" className="w-full text-indigo-600 border-indigo-200 hover:bg-indigo-50 font-medium" onClick={() => router.push("/users")}>さらにユーザーを探す</Button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Chat Partners */}
        <Card className="col-span-1 shadow-sm border-gray-100 dark:border-zinc-800 flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl">最近のメッセージ</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <div className="space-y-1 flex-1">
              {recentPartners.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center py-6 text-center">
                  <p className="text-zinc-500 text-sm mb-4">メッセージのやり取りが<br />まだありません。</p>
                </div>
              ) : (
                recentPartners.map(partner => (
                  <div key={partner.id} className="flex items-center gap-3 cursor-pointer hover:bg-zinc-50 p-3 rounded-lg transition border border-transparent hover:border-gray-100" onClick={() => router.push(`/messages/${partner.id}`)}>
                    <Avatar>
                      <AvatarImage src={partner.profile_image} />
                      <AvatarFallback className="bg-purple-100 text-purple-700 font-semibold">{partner.username.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="font-semibold text-sm text-zinc-800 truncate">{partner.username}</p>
                      <p className="text-xs text-zinc-500 truncate">{partner.latest_message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="pt-4 mt-auto">
              <Button variant="ghost" className="w-full text-zinc-600 hover:text-indigo-600 hover:bg-indigo-50" onClick={() => router.push("/messages")}>
                すべて見る
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
