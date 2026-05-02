"use client";

import { useState, useEffect } from "react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import type { DimensionScore } from "@/lib/types";

interface RadarDataPoint {
  dimension: string;
  score: number;
  fullMark: 100;
}

/** PersonalityRadar — Recharts radar chart showing 7 scoring dimensions */
export default function PersonalityRadar({
  scores,
}: {
  scores: DimensionScore[];
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(timer);
  }, []);

  const data: RadarDataPoint[] = scores.map((s) => ({
    dimension: s.label.replace(" Score", ""),
    score: s.score,
    fullMark: 100,
  }));

  return (
    <section>
      <h2
        className="font-display text-xs uppercase tracking-display mb-8"
        style={{ color: "var(--muted)" }}
      >
        PERSONALITY RADAR
      </h2>
      <div
        className={`mx-auto transition-all duration-1000 ${mounted ? "animate-radar-expand" : "scale-0 opacity-0"}`}
        style={{ maxWidth: 500, width: "100%" }}
      >
        <ResponsiveContainer width="100%" height={360} minWidth={280}>
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{
                fill: "var(--muted)",
                fontSize: 11,
                fontFamily: "'Space Mono', monospace",
              }}
            />
            <defs>
              <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00ff87" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#00cc6a" stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <Radar
              name="Score"
              dataKey="score"
              stroke="var(--accent)"
              fill="url(#radarFill)"
              strokeWidth={2}
              animationDuration={1000}
              animationBegin={200}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
