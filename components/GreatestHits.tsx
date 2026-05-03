"use client";

import type { TradeRecord } from "@/lib/types";

function TradeCard({
  trade,
  type,
}: {
  trade: TradeRecord;
  type: "best" | "worst";
}) {
  const isBest = type === "best";
  const borderColor = isBest ? "rgba(0,255,135,0.3)" : "rgba(255,61,61,0.3)";
  const bgColor = isBest ? "#00ff870a" : "#ff3d3d0a";
  const glowColor = isBest
    ? "0 0 24px rgba(0,255,135,0.1)"
    : "0 0 24px rgba(255,61,61,0.1)";
  const pnlColor = isBest ? "var(--accent)" : "var(--danger)";
  const percentSign = trade.pnlPercent >= 0 ? "+" : "";
  const usdSign = trade.pnlUsd >= 0 ? "+" : "-";

  return (
    <div
      className="flex-1 p-6 transition-all duration-200"
      style={{
        border: `1px solid ${borderColor}`,
        background: bgColor,
        boxShadow: glowColor,
      }}
    >
      <p
        className="font-mono text-[10px] uppercase tracking-display mb-4"
        style={{ color: "var(--muted)" }}
      >
        {isBest ? "BEST TRADE" : "WORST TRADE"}
      </p>
      <p
        className="font-display text-2xl font-bold mb-2"
        style={{ color: "var(--text)" }}
      >
        {trade.tokenSymbol}
      </p>
      <p
        className="font-mono text-[36px] leading-none font-bold mb-4"
        style={{ color: pnlColor }}
      >
        {percentSign}
        {trade.pnlPercent.toFixed(1)}%
      </p>
      <div className="space-y-1">
        <div className="flex justify-between">
          <span
            className="font-mono text-xs"
            style={{ color: "var(--muted)" }}
          >
            P&L
          </span>
          <span className="font-mono text-xs" style={{ color: pnlColor }}>
            {usdSign}${Math.abs(trade.pnlUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex justify-between">
          <span
            className="font-mono text-xs"
            style={{ color: "var(--muted)" }}
          >
            ENTRY
          </span>
          <span
            className="font-mono text-xs"
            style={{ color: "var(--text)" }}
          >
            ${trade.entryPrice < 0.01 ? trade.entryPrice.toExponential(2) : trade.entryPrice.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span
            className="font-mono text-xs"
            style={{ color: "var(--muted)" }}
          >
            EXIT
          </span>
          <span
            className="font-mono text-xs"
            style={{ color: "var(--text)" }}
          >
            ${trade.exitPrice < 0.01 ? trade.exitPrice.toExponential(2) : trade.exitPrice.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between">
          <span
            className="font-mono text-xs"
            style={{ color: "var(--muted)" }}
          >
            HELD
          </span>
          <span
            className="font-mono text-xs"
            style={{ color: "var(--text)" }}
          >
            {trade.holdDuration}
          </span>
        </div>
      </div>
    </div>
  );
}

/** GreatestHits — displays best and worst trade cards side by side */
export default function GreatestHits({
  bestTrade,
  worstTrade,
}: {
  bestTrade: TradeRecord | null;
  worstTrade: TradeRecord | null;
}) {
  if (!bestTrade && !worstTrade) return null;

  return (
    <section>
      <h2
        className="font-display text-xs uppercase tracking-display mb-8"
        style={{ color: "var(--muted)" }}
      >
        GREATEST HITS
      </h2>
      <div className="flex flex-col sm:flex-row gap-4">
        {bestTrade && <TradeCard trade={bestTrade} type="best" />}
        {worstTrade && <TradeCard trade={worstTrade} type="worst" />}
      </div>
    </section>
  );
}
