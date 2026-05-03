import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DEGEN.ID — Solana Wallet Personality Profiler",
  description: "Your wallet doesn't lie. We just translate it.",
  openGraph: {
    title: "DEGEN.ID",
    description: "Your wallet doesn't lie. We just translate it.",
    url: "https://degen-id.vercel.app/",
    siteName: "DEGEN.ID",
    type: "website",
  },
};

/** Root layout — wraps all pages with base HTML, fonts, and global CSS */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body antialiased">{children}</body>
    </html>
  );
}
