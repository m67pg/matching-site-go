import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "メッセージ",
};

export default function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
