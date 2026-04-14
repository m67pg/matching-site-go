"use client";

import { useState, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>({});
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const statsData = await fetchApi("/api/admin/stats");
        setStats(statsData);
        const usersData = await fetchApi("/api/admin/users");
        setUsers(usersData.users || []);
      } catch (err: any) {
        setError(err.message || "データ取得に失敗しました。管理者権限がない可能性があります。");
      }
    };
    loadData();
  }, []);

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-10">
        <div className="p-8 bg-red-50 border border-red-200 text-red-600 font-medium text-center rounded-lg">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">管理者ダッシュボード</h1>
      </div>

      <Tabs defaultValue="stats" className="w-full">
        <TabsList className="mb-6 bg-gray-100 p-1 w-full justify-start h-auto rounded-lg">
          <TabsTrigger value="stats" className="font-semibold px-6 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">全体統計</TabsTrigger>
          <TabsTrigger value="users" className="font-semibold px-6 py-2 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm">ユーザー管理</TabsTrigger>
        </TabsList>
        
        <TabsContent value="stats" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-indigo-100 shadow-sm">
              <CardHeader className="pb-2 bg-indigo-50/50">
                <CardTitle className="text-sm font-semibold text-indigo-700">総ユーザー数</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-4xl font-black text-gray-800">{stats.users || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-pink-100 shadow-sm">
              <CardHeader className="pb-2 bg-pink-50/50">
                <CardTitle className="text-sm font-semibold text-pink-700">総いいね数</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-4xl font-black text-gray-800">{stats.likes || 0}</div>
              </CardContent>
            </Card>
            <Card className="border-emerald-100 shadow-sm">
              <CardHeader className="pb-2 bg-emerald-50/50">
                <CardTitle className="text-sm font-semibold text-emerald-700">総メッセージ数</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-4xl font-black text-gray-800">{stats.messages || 0}</div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="users" className="mt-0">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50 pb-4">
              <CardTitle className="text-lg">登録ユーザー一覧</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead className="text-xs text-gray-600 uppercase bg-gray-100 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 font-semibold">ID</th>
                      <th className="px-6 py-4 font-semibold">ユーザー名</th>
                      <th className="px-6 py-4 font-semibold">メール</th>
                      <th className="px-6 py-4 font-semibold">ロール</th>
                      <th className="px-6 py-4 font-semibold text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.ID} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-gray-500">#{u.ID}</td>
                        <td className="px-6 py-4 font-medium text-gray-900">{u.Username}</td>
                        <td className="px-6 py-4 text-gray-600">{u.Email}</td>
                        <td className="px-6 py-4">
                          {u.IsAdmin ? (
                            <span className="bg-purple-100 text-purple-700 px-2.5 py-1 rounded-md text-xs font-bold ring-1 ring-purple-200">Admin</span>
                          ) : (
                            <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-xs font-semibold ring-1 ring-gray-200">Guest</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-8 text-xs font-semibold">
                            削除 (未実装)
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
