"use client";

import { useState, useRef, useEffect } from "react";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";

export default function ProfilePage() {
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [age, setAge] = useState("");
  const [location, setLocation] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [profileImage, setProfileImage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchApi("/api/me")
      .then((res) => {
        if (res.user) {
          setUsername(res.user.username || "");
          setBio(res.user.bio || "");
          setAge(res.user.age?.toString() || "");
          setLocation(res.user.location || "");
          setHobbies(res.user.hobbies || "");
          setProfileImage(res.user.profile_image || "");
        }
      })
      .catch((err) => console.error("Failed to fetch profile", err))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      await fetchApi("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ 
          username, 
          bio,
          age: parseInt(age) || 0,
          location,
          hobbies
        }),
      });
      setMessage("プロフィールを更新しました");
    } catch (err: any) {
      if (err.message === "Failed to fetch") {
        setError("サーバーとの通信に失敗しました。時間をおいて再度お試しください。");
      } else {
        setError(err.message || "プロフィールを更新できませんでした");
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMessage("");
    setError("");

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetchApi("/api/upload-avatar", {
        method: "POST",
        body: formData,
      });
      setProfileImage(res.avatar_url);
      setMessage(res.message || "画像を更新しました");
    } catch (err: any) {
      setError(err.message || "画像のアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="text-center p-10 text-gray-500">読み込み中...</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6 md:mt-10 mb-20 bg-white shadow-sm md:rounded-2xl border border-gray-100">
      <h1 className="text-2xl font-bold mb-8 text-gray-800">プロフィール編集</h1>
      
      {message && <div className="p-3 mb-6 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">{message}</div>}
      {error && <div className="p-3 mb-6 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">{error}</div>}

      <div className="flex flex-col items-center mb-8">
        <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <Avatar className="w-28 h-28 border-4 border-gray-50 shadow-sm transition-opacity group-hover:opacity-80">
            <AvatarImage src={profileImage} alt={username} />
            <AvatarFallback className="text-2xl">{username.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="text-white w-8 h-8" />
          </div>
        </div>
        <input 
          type="file" 
          accept="image/*" 
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          disabled={uploading} 
        />
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4" 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? "アップロード中..." : "画像を変更"}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-gray-700 font-semibold">ユーザー名</Label>
            <Input 
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="新しいユーザー名" 
              className="focus-visible:ring-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age" className="text-gray-700 font-semibold">年齢</Label>
            <Input 
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="年齢" 
              className="focus-visible:ring-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location" className="text-gray-700 font-semibold">居住地</Label>
            <Input 
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="東京都" 
              className="focus-visible:ring-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hobbies" className="text-gray-700 font-semibold">趣味</Label>
            <Input 
              id="hobbies"
              value={hobbies}
              onChange={(e) => setHobbies(e.target.value)}
              placeholder="映画鑑賞, カフェ巡り" 
              className="focus-visible:ring-indigo-500"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="bio" className="text-gray-700 font-semibold">自己紹介</Label>
          <Textarea 
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="興味のあることやメッセージなどを入力" 
            className="min-h-[140px] focus-visible:ring-indigo-500"
          />
        </div>
        <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 mt-4 rounded-xl shadow-md transition-all active:scale-[0.98]">
          プロフィールを更新する
        </Button>
      </form>
    </div>
  );
}
