"use client";

import { useRef, useState, useCallback } from "react";
import type { WalletReport } from "@/lib/types";

function truncateAddress(addr: string): string {
  if (addr.length <= 8) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(abs).toLocaleString()}`;
  return `$${abs.toFixed(0)}`;
}

function formatSignedCurrency(value: number): string {
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatCurrency(value)}`;
}

function getSpecialty(report: WalletReport): string {
  const scores = new Map(report.scores.map((s) => [s.label, s.score]));
  const winRate = scores.get("Win Rate") ?? report.stats.winRate;
  const diamondHands = scores.get("Diamond Hands Score") ?? 50;
  const entryTiming = scores.get("Entry Timing") ?? 50;
  const risk = scores.get("Risk Appetite") ?? 50;
  const degen = scores.get("Degen Index") ?? 50;

  if (winRate > 70 && entryTiming > 70) return "Sniping entries with uncomfortable accuracy";
  if (risk > 75 && degen > 70) return "Turning risk management into performance art";
  if (diamondHands > 75) return "Holding bags until they become antiques";
  if (entryTiming < 35) return "Buying tops with surgical precision";
  if (winRate < 35) return "Finding creative new ways to donate liquidity";
  if (degen > 70) return "Touching every fresh token like it owes them money";
  return "Surviving Solana by instinct and questionable judgment";
}

function formatTradeLine(
  label: "Biggest W" | "Biggest L",
  trade: WalletReport["bestTrade"],
  fallback: string
): string {
  if (!trade) return `${label}: ${fallback}`;
  const symbol = trade.tokenSymbol ? `$${trade.tokenSymbol}` : "$UNKNOWN";
  const pnl = formatSignedCurrency(trade.pnlUsd);
  const flourish = label === "Biggest W" ? "a miracle" : "rugged later";
  return `${label}: ${pnl} on ${symbol} (held ${trade.holdDuration} — ${flourish})`;
}

/** ShareCard — generates a 1200x630 OG card image and provides tweet copy */
export default function ShareCard({ report }: { report: WalletReport }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const tweetText = `just found out my solana wallet archetype. turns out i'm a ${report.archetype.name} 🤡 → degen-id.vercel.app/wallet/${report.address} #DegenID #BirdeyeAPI`;

  const survivalScore =
    report.scores.find((s) => s.label === "Survival Rate")?.score ?? 0;
  const tokensSurvived = Math.round(
    report.stats.tokensTouched * (survivalScore / 100)
  );
  const specialty = getSpecialty(report);
  const bestTradeLine = formatTradeLine(
    "Biggest W",
    report.bestTrade,
    "No clean win detected yet"
  );
  const worstTradeLine = formatTradeLine(
    "Biggest L",
    report.worstTrade,
    "No obvious catastrophe found"
  );

  const handleGenerate = useCallback(async () => {
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#050505",
        scale: 2,
        width: 1200,
        height: 630,
        useCORS: true,
      });
      const link = document.createElement("a");
      link.download = `degen-id-${truncateAddress(report.address)}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Share card generation failed:", err);
    } finally {
      setGenerating(false);
    }
  }, [report.address]);

  const handleCopyTweet = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(tweetText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = tweetText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [tweetText]);

  return (
    <section>
      <h2
        className="font-display text-xs uppercase tracking-display mb-8"
        style={{ color: "var(--muted)" }}
      >
        SHARE YOUR REPORT
      </h2>

      <div
        ref={cardRef}
        className="relative overflow-hidden"
        style={{
          width: 1200,
          height: 630,
          background: "var(--background)",
          border: "1px solid var(--border)",
          position: "absolute",
          left: "-9999px",
          top: "-9999px",
        }}
      >
        <div className="absolute inset-0 p-14" style={{ background: "#050505" }}>
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 14,
              color: "#404040",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 28,
            }}
          >
            DEGEN.ID / {truncateAddress(report.address)}
          </p>

          <div
            style={{
              fontFamily: "'Space Mono', monospace",
              color: "#f0f0f0",
              fontSize: 25,
              lineHeight: 1.55,
              whiteSpace: "pre-wrap",
            }}
          >
            <div
              style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 42,
                fontWeight: 800,
                color: "#f0b429",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                lineHeight: 1.15,
                marginBottom: 16,
              }}
            >
              {report.archetype.emoji} {report.archetype.name}
            </div>
            <div style={{ color: "#404040", marginBottom: 14 }}>
              ─────────────────────────────────────────
            </div>
            <div>
              Win Rate: {report.stats.winRate}% | Avg Hold Time: {report.stats.avgHoldTime}
            </div>
            <div>Specialty: {specialty}</div>
            <div>Total Volume Traded: {formatCurrency(report.stats.totalVolume)}</div>
            <div>{bestTradeLine}</div>
            <div>{worstTradeLine}</div>
            <div>
              Tokens Tried: {report.stats.tokensTouched} | Tokens That Survived: {tokensSurvived}
            </div>
            <div style={{ color: "#404040", marginTop: 14, marginBottom: 14 }}>
              ─────────────────────────────────────────
            </div>
            <div style={{ color: "#a0a0a0", fontStyle: "italic" }}>
              Verdict: &ldquo;{report.verdict}&rdquo;
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3 font-mono text-sm uppercase tracking-display transition-colors duration-150"
          style={{
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--accent)",
          }}
          onMouseEnter={(e) => {
            if (!generating) {
              e.currentTarget.style.background = "var(--accent)";
              e.currentTarget.style.color = "var(--background)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--accent)";
          }}
        >
          {generating ? "GENERATING..." : "GENERATE REPORT CARD"}
        </button>

        <div
          className="p-4"
          style={{
            border: "1px solid var(--border)",
            background: "var(--card)",
          }}
        >
          <p
            className="font-mono text-xs mb-3"
            style={{ color: "var(--muted)" }}
          >
            {tweetText}
          </p>
          <button
            onClick={handleCopyTweet}
            className="font-mono text-xs uppercase tracking-display transition-colors duration-150"
            style={{ color: "var(--accent)" }}
          >
            {copied ? "COPIED ✓" : "COPY TWEET →"}
          </button>
        </div>
      </div>
    </section>
  );
}
