"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import type { WalletReport } from "@/lib/types";
import LoadingOverlay from "@/components/LoadingOverlay";
import IdentityCard from "@/components/IdentityCard";
import PersonalityRadar from "@/components/PersonalityRadar";
import GreatestHits from "@/components/GreatestHits";
import BehaviourBreakdown from "@/components/BehaviourBreakdown";
import TradingTimeline from "@/components/TradingTimeline";
import ShareCard from "@/components/ShareCard";

type FetchState = "loading" | "error" | "empty" | "ready";

function isWalletReport(data: unknown): data is WalletReport {
  return (
    typeof data === "object" &&
    data !== null &&
    "address" in data &&
    "archetype" in data &&
    "scores" in data
  );
}

/** Wallet report page — fetches report from API and renders full profile */
export default function WalletPage() {
  const params = useParams();
  const address = typeof params.address === "string" ? params.address : "";
  const [state, setState] = useState<FetchState>("loading");
  const [report, setReport] = useState<WalletReport | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!address) {
      setState("error");
      setErrorMsg("No wallet address provided.");
      return;
    }

    let cancelled = false;

    async function fetchReport() {
      try {
        const res = await fetch(`/api/wallet/${address}`);
        if (!res.ok) {
          const body: unknown = await res.json().catch(() => null);
          const msg =
            body && typeof body === "object" && "error" in body
              ? String((body as Record<string, unknown>).error)
              : "This wallet either doesn't exist or is too embarrassed to be found.";
          if (!cancelled) {
            setErrorMsg(msg);
            setState("error");
          }
          return;
        }

        const data: unknown = await res.json();

        if (!isWalletReport(data)) {
          if (!cancelled) {
            setErrorMsg(
              "This wallet either doesn't exist or is too embarrassed to be found."
            );
            setState("error");
          }
          return;
        }

        if (data.isEmpty) {
          if (!cancelled) setState("empty");
          return;
        }

        if (!cancelled) {
          setReport(data);
          setState("ready");
        }
      } catch {
        if (!cancelled) {
          setErrorMsg(
            "This wallet either doesn't exist or is too embarrassed to be found."
          );
          setState("error");
        }
      }
    }

    fetchReport();
    return () => {
      cancelled = true;
    };
  }, [address]);

  if (state === "loading") return <LoadingOverlay />;

  if (state === "error") {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: "var(--background)" }}
      >
        <p
          className="font-mono text-sm text-center max-w-md mb-8"
          style={{ color: "var(--muted)" }}
        >
          {errorMsg}
        </p>
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-display transition-colors duration-150"
          style={{ color: "var(--accent)" }}
        >
          ← BACK TO SEARCH
        </Link>
      </main>
    );
  }

  if (state === "empty") {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center px-6"
        style={{ background: "var(--background)" }}
      >
        <p className="text-6xl mb-6">👻</p>
        <p
          className="font-mono text-sm text-center max-w-md mb-8"
          style={{ color: "var(--muted)" }}
        >
          This wallet has never touched a token. Respectable, honestly.
        </p>
        <Link
          href="/"
          className="font-mono text-xs uppercase tracking-display transition-colors duration-150"
          style={{ color: "var(--accent)" }}
        >
          ← BACK TO SEARCH
        </Link>
      </main>
    );
  }

  if (!report) return null;

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

        {report.demoMode && (
          <div
            className="font-mono text-xs text-center py-2 mb-8"
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
            }}
          >
            DEMO MODE — Connect Birdeye API for real data
          </div>
        )}

        <div className="space-y-[80px]">
          <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
            <IdentityCard report={report} />
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "80ms", animationFillMode: "backwards" }}>
            <PersonalityRadar scores={report.scores} />
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "160ms", animationFillMode: "backwards" }}>
            <GreatestHits
              bestTrade={report.bestTrade}
              worstTrade={report.worstTrade}
            />
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "240ms", animationFillMode: "backwards" }}>
            <BehaviourBreakdown scores={report.scores} />
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "320ms", animationFillMode: "backwards" }}>
            <TradingTimeline timeline={report.timeline} />
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "400ms", animationFillMode: "backwards" }}>
            <ShareCard report={report} />
          </div>
        </div>
      </div>
    </main>
  );
}
