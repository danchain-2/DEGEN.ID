import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/db";
import type { Archetype, LeaderboardEntry } from "@/lib/types";
import { getAllArchetypes } from "@/lib/archetypes";

function generateDemoLeaderboard(): Record<string, LeaderboardEntry[]> {
  const archetypes = getAllArchetypes();
  const demoAddresses = [
    "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "3Kz9aMHnFxJMCRzCiRZ3xCUTHHxF5pBnM9eCvuJaXRFb",
    "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    "5ZWj7a1f8tWkjBESHKgrLmXshuXxqeY9SYcfbshpAqPG",
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    "4k3Dyjzvzp8eMZFUEDRWKJNy62u6FQ7LFLBi1pJcLHRw",
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    "GDfnEsia2WLAW5t8yx2tCjTZjkd4M3CZyLbXNJnbiqRo",
    "AGFEad2et2ZJif9jaGDMi8TuTc8FYNUBvjsigt3ki3Fd",
  ];

  function makeEntries(sortBy: string): LeaderboardEntry[] {
    return demoAddresses.slice(0, 10).map((addr, i) => {
      const arch = archetypes[i % archetypes.length];
      const seed = addr.charCodeAt(0) + addr.charCodeAt(1);
      return {
        address: addr,
        archetype: arch as Archetype,
        winRate: sortBy === "winRate" ? 90 - i * 7 : 30 + (seed % 50),
        totalVolume: sortBy === "volume" ? 500000 - i * 45000 : 1000 + (seed % 100000),
        degenIndex: sortBy === "degen" ? 95 - i * 8 : 20 + (seed % 60),
        diamondHandsScore: sortBy === "diamondHands" ? 92 - i * 6 : 25 + (seed % 55),
        demoMode: true,
      };
    });
  }

  return {
    winRate: makeEntries("winRate"),
    volume: makeEntries("volume"),
    degen: makeEntries("degen"),
    diamondHands: makeEntries("diamondHands"),
  };
}

/** GET /api/leaderboard — returns top 10 per category from cached reports */
export async function GET(): Promise<NextResponse> {
  const categories = ["winRate", "volume", "degen", "diamondHands"] as const;

  const results: Record<string, LeaderboardEntry[]> = {};
  let hasData = false;

  for (const cat of categories) {
    const entries = getLeaderboard(cat);
    results[cat] = entries;
    if (entries.length > 0) hasData = true;
  }

  if (!hasData) {
    return NextResponse.json(generateDemoLeaderboard());
  }

  return NextResponse.json(results);
}
