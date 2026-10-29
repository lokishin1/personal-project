import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

import { cn } from "@/lib/utils";

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "종목 한눈에 보기",
  description: "미국 주식·ETF의 현재가, 상승률, PER/PBR, 기간별 그래프를 한 화면에서 확인합니다.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={cn("h-full", "antialiased", geistSans.variable, geistMono.variable, "font-sans", inter.variable)}
    >
      <body className="min-h-full flex flex-col">
        <header className="border-b">
          <div className="mx-auto flex w-full max-w-4xl items-center px-4 py-3">
            <Link href="/" className="font-heading font-semibold">
              종목 한눈에 보기
            </Link>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4">{children}</main>
      </body>
    </html>
  );
}
