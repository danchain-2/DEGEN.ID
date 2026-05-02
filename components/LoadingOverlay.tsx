"use client";

import { useState, useEffect } from "react";

const LOADING_LINES = [
  "Counting your mistakes...",
  "Calculating regret...",
  "Locating your best trade...",
  "This may take a moment.",
  "Scanning transaction history...",
  "Rating your diamond hands...",
  "Evaluating exit strategy...",
  "Checking survival rate...",
];

/** LoadingOverlay — full-screen dark loading state with rotating stat lines */
export default function LoadingOverlay() {
  const [lineIndex, setLineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLineIndex((prev) => (prev + 1) % LOADING_LINES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: "var(--background)" }}
    >
      <p
        className="font-mono text-2xl tracking-display mb-8"
        style={{ color: "var(--text)" }}
      >
        ANALYSING WALLET...<span className="animate-blink">_</span>
      </p>
      <p
        className="font-mono text-sm transition-opacity duration-300"
        style={{ color: "var(--muted)" }}
        key={lineIndex}
      >
        {LOADING_LINES[lineIndex]}
      </p>
    </div>
  );
}
