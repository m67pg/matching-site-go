"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

type User = {
  ID: number;
  Username: string;
  Email: string;
  ProfileImage: string;
  Bio: string;
  Age: number;
  Location: string;
  Hobbies: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [matchedUser, setMatchedUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const query = search ? `?username=${encodeURIComponent(search)}` : "";
        const data = await fetchApi(`/api/users${query}`);
        setUsers(data.users || []);
        setError("");
      } catch (err: any) {
        setError(err.message || "Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleLike = async (user: User) => {
    try {
      const res = await fetchApi(`/api/like/${user.ID}`, { method: "POST" });
      if (res.matched) {
        setMatchedUser(user);
      } else {
        alert("いいねを送信しました！");
      }
    } catch (err: any) {
      alert(err.message || "いいねに失敗しました");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">ユーザーを探す</h1>
        <div className="w-full md:max-w-xs relative">
          <Input
            type="text"
            placeholder="ユーザー名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
          {error.includes("401") ? "セッションが切れました。再度ログインしてください。" : error}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading && users.length === 0 ? (
            <p className="text-gray-500 col-span-full">読み込み中...</p>
          ) : users.length === 0 ? (
            <p className="text-gray-500 col-span-full py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">ユーザーが見つかりません</p>
          ) : (
            users.map((user) => (
              <Card key={user.ID} className="flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300 bg-white/70 backdrop-blur-sm border-gray-100 group">
                <CardHeader className="pb-3 border-b border-gray-50/50">
                  <CardTitle className="text-lg flex items-center space-x-4">
                    {user.ProfileImage ? (
                      <img src={user.ProfileImage} alt={user.Username} className="w-12 h-12 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">
                        {user.Username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-800 group-hover:text-indigo-600 transition-colors">{user.Username}</span>
                      {(user.Age || user.Location) && (
                        <span className="text-xs text-gray-500 mt-0.5">
                          {user.Age ? `${user.Age}歳 ` : ""} {user.Location ? `📍${user.Location}` : ""}
                        </span>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 flex-grow flex flex-col justify-between space-y-4">
                  <div className="mb-2">
                    {user.Hobbies && (
                      <div className="text-xs text-indigo-600 font-medium bg-indigo-50 inline-block px-2 py-1 rounded truncate max-w-full">
                        {user.Hobbies}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {user.Bio || "自己紹介がまだありません"}
                  </p>
                  <Button 
                    onClick={() => handleLike(user)}
                    className="w-full bg-pink-50 text-pink-600 hover:bg-pink-100 border border-pink-200 transition-colors"
                    variant="outline"
                  >
                    いいね！
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* マッチング成功時のダイアログ */}
      <Dialog open={!!matchedUser} onOpenChange={(open) => !open && setMatchedUser(null)}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-pink-600 text-center">マッチングしました！ 🎉</DialogTitle>
            <DialogDescription className="py-4 text-center">
              {matchedUser?.Username} さんと両思いです。<br/>さっそくメッセージを送ってみましょう！
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
            <Button variant="outline" onClick={() => setMatchedUser(null)} className="w-full">
              あとで
            </Button>
            <Button onClick={() => router.push(`/messages/${matchedUser?.ID}`)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              今すぐメッセージを送る
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
