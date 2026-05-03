"use client";

import { useState, useEffect, useRef } from "react";
import type { WalletReport } from "@/lib/types";

function truncateAddress(addr: string): string {
  if (addr.length <= 8) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function formatVolume(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

interface StatBlockProps {
  label: string;
  value: string | number;
  suffix?: string;
}

function AnimatedNumber({ target, suffix }: { target: number; suffix?: string }) {
  const [current, setCurrent] = useState(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    const duration = 800;
    const start = performance.now();
    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(target * eased));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [target]);

  return (
    <span>
      {current}
      {suffix}
    </span>
  );
}

function StatBlock({ label, value, suffix }: StatBlockProps) {
  const numericValue = typeof value === "number" ? value : null;
  return (
    <div className="flex flex-col items-center px-4 py-2 min-w-0">
      <span
        className="font-mono text-[40px] leading-none sm:text-[48px]"
        style={{ color: "var(--text)" }}
      >
        {numericValue !== null ? (
          <AnimatedNumber target={numericValue} suffix={suffix} />
        ) : (
          <>{value}{suffix}</>
        )}
      </span>
      <span
        className="font-mono text-[10px] uppercase tracking-display mt-2"
        style={{ color: "var(--muted)" }}
      >
        {label}
      </span>
    </div>
  );
}

/** IdentityCard — hero section displaying archetype emoji, name, verdict, and key stats */
export default function IdentityCard({ report }: { report: WalletReport }) {
  const [emojiVisible, setEmojiVisible] = useState(false);
  const [nameText, setNameText] = useState("");
  const nameRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setEmojiVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fullName = report.archetype.name;
    let idx = 0;
    nameRef.current = setInterval(() => {
      idx++;
      setNameText(fullName.slice(0, idx));
      if (idx >= fullName.length && nameRef.current) {
        clearInterval(nameRef.current);
      }
    }, 80);
    return () => {
      if (nameRef.current) clearInterval(nameRef.current);
    };
  }, [report.archetype.name]);

  return (
    <section className="text-center">
      <div
        className={`text-[80px] leading-none mb-6 ${emojiVisible ? "animate-emoji-bounce" : "opacity-0"}`}
      >
        {report.archetype.emoji}
      </div>

      <h1
        className="font-display text-[48px] sm:text-[72px] leading-none tracking-display uppercase font-bold mb-4"
        style={{ color: "var(--gold)" }}
      >
        {nameText}
        <span className="animate-blink" style={{ color: "var(--gold)" }}>
          {nameText.length < report.archetype.name.length ? "|" : ""}
        </span>
      </h1>

      <p
        className="font-mono text-sm mb-2"
        style={{ color: "var(--muted)" }}
      >
        {truncateAddress(report.address)}
      </p>

      <p
        className="font-mono text-lg italic max-w-xl mx-auto mb-10"
        style={{ color: "#a0a0a0" }}
      >
        {report.verdict}
      </p>

      <div
        className="flex items-stretch justify-center divide-x mx-auto max-w-2xl"
        style={{
          borderColor: "var(--border)",
        }}
      >
        <style jsx>{`
          .divide-x > * + * {
            border-left: 1px solid var(--border);
          }
        `}</style>
        <StatBlock label="Win Rate" value={report.stats.winRate} suffix="%" />
        <StatBlock label="Total Volume" value={formatVolume(report.stats.totalVolume)} />
        <StatBlock label="Tokens Touched" value={report.stats.tokensTouched} />
        <StatBlock label="Avg Hold Time" value={report.stats.avgHoldTime} />
      </div>
    </section>
  );
}
