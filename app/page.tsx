"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SearchBar, { getRecentSearches } from "@/components/SearchBar";

/** Homepage — minimal hero with search bar and recent wallet pills */
export default function HomePage() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchVisible, setSearchVisible] = useState(false);
  const [pillsVisible, setPillsVisible] = useState(false);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
    const searchTimer = setTimeout(() => setSearchVisible(true), 600);
    const pillsTimer = setTimeout(() => setPillsVisible(true), 800);
    return () => {
      clearTimeout(searchTimer);
      clearTimeout(pillsTimer);
    };
  }, []);

  return (
    <main
      className="min-h-screen flex flex-col items-center px-6"
      style={{ background: "var(--background)" }}
    >
      <div
        className="flex flex-col items-center w-full"
        style={{ marginTop: "45vh", transform: "translateY(-50%)" }}
      >
        <h1
          className="font-display text-4xl sm:text-5xl font-bold tracking-display uppercase mb-3"
          style={{ color: "var(--text)" }}
        >
          DEGEN.ID
        </h1>

        <p
          className="font-mono text-sm mb-10 text-center max-w-md"
          style={{ color: "var(--muted)" }}
        >
          Your wallet doesn&apos;t lie. We just translate it.
        </p>

        <div
          className={`w-full flex justify-center transition-all duration-500 ${searchVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        >
          <SearchBar />
        </div>

        {recentSearches.length > 0 && (
          <div
            className={`mt-6 flex flex-wrap gap-2 justify-center max-w-[560px] transition-all duration-500 ${pillsVisible ? "opacity-100" : "opacity-0"}`}
          >
            {recentSearches.map((addr, i) => (
              <Link
                key={addr}
                href={`/wallet/${addr}`}
                className="font-mono text-xs px-3 py-1.5 transition-colors duration-200"
                style={{
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                  animationDelay: `${i * 60}ms`,
                  opacity: pillsVisible ? 1 : 0,
                  transition: `opacity 0.3s ease ${i * 60}ms, color 0.15s ease, border-color 0.15s ease`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.color = "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.color = "var(--muted)";
                }}
              >
                {addr.slice(0, 4)}...{addr.slice(-4)}
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer
        className="fixed bottom-6 left-0 right-0 text-center"
      >
        <Link
          href="/leaderboard"
          className="font-mono text-xs tracking-display uppercase transition-colors duration-150"
          style={{ color: "var(--muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--accent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--muted)";
          }}
        >
          LEADERBOARD →
        </Link>
      </footer>
    </main>
  );
}
