import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Learning",
  description: "Adaptive learning platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="sticky top-0 z-40 backdrop-blur-md border-b border-zinc-800/50" style={{ backgroundColor: "rgba(12, 13, 18, 0.92)" }}>
          <div className="mx-auto max-w-7xl px-6 h-14 flex items-center">
            <Nav />
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
