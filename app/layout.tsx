import type { Metadata } from "next";
import { Martian_Mono, Murecho } from "next/font/google";
import "./globals.css";

// 見出し・本文: Murecho（日本語ゴシック。可変ウェイト）
// 数値の読み値: Martian Mono（確率・スコアを計器の目盛りのように表示する）
const murecho = Murecho({
  variable: "--font-murecho",
  subsets: ["latin"],
  display: "swap",
});

const martianMono = Martian_Mono({
  variable: "--font-martian",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jev Decision Lab",
  description: "文章を書かないAIに、判断してもらう。TypeSafe AI の Jev を体験する勉強会用デモ",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${murecho.variable} ${martianMono.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
