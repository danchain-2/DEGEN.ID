"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { LeaderboardEntry } from "@/lib/types";

type Category = "winRate" | "volume" | "degen" | "diamondHands";

const TABS: { key: Category; label: string }[] = [
  { key: "winRate", label: "HIGHEST WIN RATE" },
  { key: "volume", label: "MOST VOLUME" },
  { key: "degen", label: "MOST DEGEN" },
  { key: "diamondHands", label: "DIAMOND HANDS" },
];

function truncateAddress(addr: string): string {
  if (addr.length <= 8) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function formatStat(category: Category, entry: LeaderboardEntry): string {
  switch (category) {
    case "winRate":
      return `${entry.winRate}%`;
    case "volume":
      return entry.totalVolume >= 1000
        ? `$${(entry.totalVolume / 1000).toFixed(1)}K`
        : `$${entry.totalVolume.toFixed(0)}`;
    case "degen":
      return `${entry.degenIndex}`;
    case "diamondHands":
      return `${entry.diamondHandsScore}`;
  }
}

/** Leaderboard page — top 10 wallets across four categories */
export default function LeaderboardPage() {
  const [data, setData] = useState<Record<Category, LeaderboardEntry[]> | null>(null);
  const [activeTab, setActiveTab] = useState<Category>("winRate");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const res = await fetch("/api/leaderboard");
        if (!res.ok) throw new Error("Failed to fetch leaderboard");
        const json: unknown = await res.json();
        if (json && typeof json === "object") {
          setData(json as Record<Category, LeaderboardEntry[]>);
        }
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaderboard();
  }, []);

  const entries = data ? data[activeTab] ?? [] : [];

  return (
    <main
      className="min-h-screen px-6 py-16"
      style={{ background: "var(--background)" }}
    >
      <div className="max-w-content mx-auto">
        <nav className="mb-12">
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-display transition-colors duration-150"
            style={{ color: "var(--muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--muted)";
            }}
          >
            ← BACK
          </Link>
        </nav>

        <h1
          className="font-display text-3xl sm:text-4xl font-bold tracking-display uppercase mb-2"
          style={{ color: "var(--text)" }}
        >
          LEADERBOARD
        </h1>
        <p
          className="font-mono text-sm mb-10"
          style={{ color: "var(--muted)" }}
        >
          Top performers from previously analysed wallets.
        </p>

        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="font-mono text-xs px-3 py-1.5 uppercase tracking-display transition-all duration-150"
              style={{
                border: `1px solid ${activeTab === tab.key ? "var(--accent)" : "var(--border)"}`,
                color: activeTab === tab.key ? "var(--accent)" : "var(--muted)",
                background:
                  activeTab === tab.key
                    ? "rgba(0,255,135,0.05)"
                    : "transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p
            className="font-mono text-sm"
            style={{ color: "var(--muted)" }}
          >
            Loading...
          </p>
        ) : entries.length === 0 ? (
          <p
            className="font-mono text-sm"
            style={{ color: "var(--muted)" }}
          >
            No data yet. Search some wallets first.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, i) => {
              const isTop = i === 0;
              return (
                <div
                  key={entry.address}
                  className="flex items-center gap-4 px-4 py-3 transition-all duration-200"
                  style={{
                    border: `1px solid ${isTop ? "rgba(240,180,41,0.3)" : "var(--border)"}`,
                    background: isTop ? "rgba(240,180,41,0.03)" : "var(--card)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent)";
                    e.currentTarget.style.boxShadow =
                      "0 0 24px rgba(0,255,135,0.1)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isTop
                      ? "rgba(240,180,41,0.3)"
                      : "var(--border)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <span
                    className="font-mono text-sm w-6 text-center"
                    style={{
                      color: isTop ? "var(--gold)" : "var(--muted)",
                    }}
                  >
                    {i + 1}
                  </span>

                  <span className="text-xl">{entry.archetype.emoji}</span>

                  <div className="flex-1 min-w-0">
                    <p
                      className="font-display text-sm font-bold truncate"
                      style={{
                        color: isTop ? "var(--gold)" : "var(--text)",
                      }}
                    >
                      {entry.archetype.name}
                    </p>
                    <p
                      className="font-mono text-xs"
                      style={{ color: "var(--muted)" }}
                    >
                      {truncateAddress(entry.address)}
                    </p>
                  </div>

                  <span
                    className="font-mono text-lg font-bold"
                    style={{ color: "var(--accent)" }}
                  >
                    {formatStat(activeTab, entry)}
                  </span>

                  <Link
                    href={`/wallet/${entry.address}`}
                    className="font-mono text-xs uppercase tracking-display transition-colors duration-150 whitespace-nowrap"
                    style={{ color: "var(--muted)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--muted)";
                    }}
                  >
                    VIEW →
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {entries.some((e) => e.demoMode) && (
          <p
            className="font-mono text-xs mt-6 text-center"
            style={{ color: "var(--muted)" }}
          >
            DEMO DATA — Connect Birdeye API and search wallets for real rankings.
          </p>
        )}
      </div>
    </main>
  );
}
