"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TimelinePoint } from "@/lib/types";

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: TimelinePoint;
  }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0].payload;
  return (
    <div
      className="px-3 py-2"
      style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="font-mono text-xs" style={{ color: "var(--text)" }}>
        {label}
      </p>
      <p className="font-mono text-xs" style={{ color: "var(--accent)" }}>
        ${data.volume.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
      <p className="font-mono text-xs" style={{ color: "var(--muted)" }}>
        {data.trades} trades
      </p>
    </div>
  );
}

/** TradingTimeline — horizontal scrollable Recharts activity chart showing volume over time */
export default function TradingTimeline({
  timeline,
}: {
  timeline: TimelinePoint[];
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || timeline.length === 0) return null;

  const chartWidth = Math.max(timeline.length * 48, 600);

  return (
    <section>
      <h2
        className="font-display text-xs uppercase tracking-display mb-8"
        style={{ color: "var(--muted)" }}
      >
        TRADING TIMELINE
      </h2>
      <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: "touch" }}>
        <div style={{ minWidth: chartWidth, height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timeline} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="date"
                tick={{
                  fill: "var(--muted)",
                  fontSize: 10,
                  fontFamily: "'Space Mono', monospace",
                }}
                tickFormatter={(val: string) => val.slice(5)}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{
                  fill: "var(--muted)",
                  fontSize: 10,
                  fontFamily: "'Space Mono', monospace",
                }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(val: number) =>
                  val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val)
                }
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar dataKey="volume" animationDuration={1000}>
                {timeline.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    fill={entry.isPeak ? "var(--accent)" : "var(--border)"}
                    opacity={entry.isPeak ? 1 : 0.6}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
