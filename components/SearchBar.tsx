"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** SearchBar — main wallet address input with validation and navigation */
export default function SearchBar() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Enter a wallet address.");
      return;
    }
    if (!BASE58_REGEX.test(trimmed) || trimmed.length < 32 || trimmed.length > 44) {
      setError("Invalid address. Check and try again.");
      return;
    }
    setError("");

    const stored = getRecentSearches();
    const updated = [trimmed, ...stored.filter((s) => s !== trimmed)].slice(0, 8);
    try {
      localStorage.setItem("degen-id-recent", JSON.stringify(updated));
    } catch {
      // localStorage unavailable
    }

    router.push(`/wallet/${trimmed}`);
  }, [value, router]);

  return (
    <div className="w-full max-w-[560px]">
      <div
        className="flex items-stretch"
        style={{
          border: "1px solid var(--border)",
          background: "var(--background)",
        }}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
          placeholder="Paste any Solana wallet address"
          className="flex-1 px-4 py-3 font-mono text-sm outline-none"
          style={{
            background: "var(--background)",
            color: "var(--text)",
            border: "none",
          }}
          spellCheck={false}
          autoComplete="off"
        />
        <button
          onClick={handleSubmit}
          className="px-5 py-3 font-mono text-sm font-bold tracking-wide whitespace-nowrap transition-colors duration-150"
          style={{
            borderLeft: "1px solid var(--border)",
            color: "var(--accent)",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--accent)";
            e.currentTarget.style.color = "var(--background)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--accent)";
          }}
        >
          ANALYSE →
        </button>
      </div>
      <style jsx>{`
        input:focus {
          box-shadow: none;
        }
        div:focus-within {
          border-color: var(--accent) !important;
          box-shadow: 0 0 40px rgba(0, 255, 135, 0.08);
        }
      `}</style>
      {error && (
        <p
          className="mt-2 font-mono text-xs"
          style={{ color: "var(--danger)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

export function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem("degen-id-recent");
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === "string").slice(0, 8);
    }
    return [];
  } catch {
    return [];
  }
}
