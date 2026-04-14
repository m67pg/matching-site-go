import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ユーザー一覧",
};

export default function UsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
