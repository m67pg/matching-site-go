"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    // ブラウザのオートフィル遅延による上書きを防ぐためのクリア処理
    const timer = setTimeout(() => {
      setEmail("");
      setPassword("");
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setMessage("メールアドレスとパスワードを入力してください");
      return;
    }

    try {
      const res = await fetchApi("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(res.token);
      setMessage(`ログイン成功: ${res.message} (リダイレクト中...)`);
      setTimeout(() => router.replace("/"), 1000);
    } catch (err: any) {
      setMessage(err.message || "ログインに失敗しました");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow space-y-6 lg:border border-gray-100">
        <h2 className="text-2xl font-bold text-center text-gray-900">マッチングサイトにログイン</h2>

        {message && (
          <div className="p-3 bg-blue-50 text-blue-800 rounded text-sm font-medium text-center shadow-sm">
            {message}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
          {/* 自動入力を防ぐためのダミー項目 */}
          <input type="text" style={{ display: "none" }} aria-hidden="true" />
          <input type="password" style={{ display: "none" }} aria-hidden="true" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">メールアドレス</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              required
              autoComplete="one-time-code"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">パスワード</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" className="w-full">
            ログイン
          </Button>
        </form>
      </div>
    </div>
  );
}
