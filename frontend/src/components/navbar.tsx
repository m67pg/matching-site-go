"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isAuthenticated, clearToken } from "@/lib/auth";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  Users, 
  MessageCircle, 
  User as UserIcon, 
  LogOut, 
  Menu, 
  X,
  Heart
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserData {
  username: string;
}

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const authStatus = isAuthenticated();
    setLoggedIn(authStatus);

    if (authStatus) {
      setLoading(true);
      fetchApi("/api/me")
        .then((res) => {
          if (res && res.user && res.user.username) {
            setUser({ username: res.user.username });
          }
        })
        .catch((err) => {
          console.error("Failed to fetch user info:", err);
          if (err.message.includes("401")) {
             handleLogout();
          }
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [pathname]);

  // Close mobile menu when pathname changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (pathname === "/login") {
    return null;
  }

  const handleLogout = () => {
    clearToken();
    setLoggedIn(false);
    setUser(null);
    router.replace("/login");
  };

  const navItems = [
    { name: "ダッシュボード", href: "/", icon: Home },
    { name: "ユーザーを探す", href: "/users", icon: Users },
    { name: "メッセージ", href: "/messages", icon: MessageCircle },
    { name: "プロフィール", href: "/profile", icon: UserIcon },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-zinc-950/95 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => router.push("/")}
          >
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:bg-indigo-700 transition-colors">
              <Heart className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-50">
              マッチングサイト
            </span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {loggedIn && navItems.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                size="sm"
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
                  pathname === item.href 
                    ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300" 
                    : "text-zinc-600 hover:text-indigo-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:text-indigo-300 dark:hover:bg-zinc-900"
                )}
                onClick={() => router.push(item.href)}
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </Button>
            ))}
          </div>

          {/* Desktop User Menu / Login Button */}
          <div className="hidden md:flex items-center gap-4">
            {loading ? (
              <div className="h-8 w-24 bg-zinc-100 animate-pulse rounded" />
            ) : loggedIn ? (
              <div className="flex items-center gap-4 border-l pl-4 dark:border-zinc-800">
                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  ようこそ！ <span className="text-zinc-900 dark:text-zinc-100 font-bold">{user?.username || "..."}</span> さん
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2 border-zinc-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all" 
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  ログアウト
                </Button>
              </div>
            ) : (
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm px-6" 
                size="sm" 
                onClick={() => router.push("/login")}
              >
                ログイン
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={cn(
        "md:hidden absolute w-full bg-white border-b shadow-lg transition-all duration-300 ease-in-out dark:bg-zinc-950 dark:border-zinc-800",
        isMobileMenuOpen ? "max-h-screen opacity-100 visible" : "max-h-0 opacity-0 invisible overflow-hidden"
      )}>
        <div className="px-4 pt-2 pb-6 space-y-1">
          {loggedIn ? (
            <>
              <div className="px-3 py-4 mb-2 border-b dark:border-zinc-800">
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">現在のユーザー</p>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">ようこそ！ {user?.username} さん</p>
              </div>
              {navItems.map((item) => (
                <button
                  key={item.href}
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-3 rounded-lg text-base font-medium transition-colors",
                    pathname === item.href
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"
                  )}
                  onClick={() => router.push(item.href)}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </button>
              ))}
              <div className="pt-4 border-t mt-4 dark:border-zinc-800">
                <Button 
                  variant="destructive" 
                  className="w-full flex items-center justify-center gap-2 py-6 rounded-xl font-bold"
                  onClick={handleLogout}
                >
                  <LogOut className="w-5 h-5" />
                  ログアウト
                </Button>
              </div>
            </>
          ) : (
            <div className="py-4 px-3">
              <Button 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-6 rounded-xl text-lg shadow-md" 
                onClick={() => router.push("/login")}
              >
                ログインして始める
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
