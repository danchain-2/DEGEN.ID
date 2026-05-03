"use client";

import { useState, useEffect, useRef } from "react";
import type { DimensionScore } from "@/lib/types";

function ProgressBar({
  score,
  index,
}: {
  score: DimensionScore;
  index: number;
}) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setWidth(score.score);
    }, 200 + index * 80);
    return () => clearTimeout(timer);
  }, [score.score, index]);

  return (
    <div ref={ref} className="mb-6">
      <div className="flex justify-between items-center mb-2">
        <span
          className="font-display text-xs uppercase tracking-display"
          style={{ color: "var(--text)" }}
        >
          {score.label}
        </span>
        <span
          className="font-mono text-sm font-bold"
          style={{ color: "var(--accent)" }}
        >
          {score.score}
        </span>
      </div>
      <div
        className="w-full h-1.5"
        style={{ background: "var(--border)" }}
      >
        <div
          className="h-full transition-all duration-600 ease-out"
          style={{
            width: `${width}%`,
            background: "var(--accent)",
            transitionDuration: "600ms",
          }}
        />
      </div>
      <p
        className="font-mono text-xs mt-1.5"
        style={{ color: "var(--muted)" }}
      >
        {score.commentary}
      </p>
    </div>
  );
}

/** BehaviourBreakdown — seven animated progress bars with scoring commentary */
export default function BehaviourBreakdown({
  scores,
}: {
  scores: DimensionScore[];
}) {
  return (
    <section>
      <h2
        className="font-display text-xs uppercase tracking-display mb-8"
        style={{ color: "var(--muted)" }}
      >
        BEHAVIOUR BREAKDOWN
      </h2>
      <div>
        {scores.map((score, i) => (
          <ProgressBar key={score.label} score={score} index={i} />
        ))}
      </div>
    </section>
  );
}
