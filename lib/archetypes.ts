import type { Archetype, DimensionScore, WalletReport } from "./types";

interface ArchetypeDef extends Archetype {
  match: (scores: DimensionScore[], stats: WalletReport["stats"], lastActive?: number) => boolean;
}

const ARCHETYPES: ArchetypeDef[] = [
  {
    emoji: "😴",
    name: "THE HIBERNATOR",
    title: "The Hibernator",
    description:
      "Last active 6 months ago. Either retired or rugged into oblivion.",
    match: (_scores, _stats, lastActive) => {
      if (!lastActive) return false;
      const sixMonthsMs = 180 * 24 * 60 * 60 * 1000;
      return Date.now() - lastActive > sixMonthsMs;
    },
  },
  {
    emoji: "🦅",
    name: "THE APEX SNIPER",
    title: "The Apex Sniper",
    description: "Early entries, clean exits. Suspiciously good.",
    match: (scores) => {
      const winRate = getScore(scores, "Win Rate");
      const entry = getScore(scores, "Entry Timing");
      const exit = getScore(scores, "Exit Discipline");
      return winRate > 70 && entry > 65 && exit > 65;
    },
  },
  {
    emoji: "🐋",
    name: "THE SILENT WHALE",
    title: "The Silent Whale",
    description:
      "Large positions, long holds, doesn't need your validation.",
    match: (scores, stats) => {
      const diamond = getScore(scores, "Diamond Hands Score");
      return stats.totalVolume > 50000 && diamond > 65;
    },
  },
  {
    emoji: "💎",
    name: "THE DIAMOND MONK",
    title: "The Diamond Monk",
    description: "Buys, holds, does not panic. Possibly dead.",
    match: (scores) => {
      const diamond = getScore(scores, "Diamond Hands Score");
      const risk = getScore(scores, "Risk Appetite");
      return diamond > 75 && risk < 50;
    },
  },
  {
    emoji: "🎯",
    name: "THE ONE-HIT WONDER",
    title: "The One-Hit Wonder",
    description:
      "Had one legendary trade and has been chasing that feeling ever since.",
    match: (scores, stats) => {
      const winRate = getScore(scores, "Win Rate");
      return winRate < 40 && stats.tokensTouched > 5 && stats.winRate < 30;
    },
  },
  {
    emoji: "🧻",
    name: "THE PAPER HAND PROPHET",
    title: "The Paper Hand Prophet",
    description:
      "Sells everything at -20% before it 10xs without them.",
    match: (scores) => {
      const exit = getScore(scores, "Exit Discipline");
      const diamond = getScore(scores, "Diamond Hands Score");
      return exit < 35 && diamond < 30;
    },
  },
  {
    emoji: "🤡",
    name: "THE PERPETUAL BAGHOLDER",
    title: "The Perpetual Bagholder",
    description:
      "Arrives late to every party and stays until the lights go off.",
    match: (scores) => {
      const entry = getScore(scores, "Entry Timing");
      const exit = getScore(scores, "Exit Discipline");
      return entry < 35 && exit < 40;
    },
  },
  {
    emoji: "🎰",
    name: "THE CASINO GHOST",
    title: "The Casino Ghost",
    description:
      "All volume, no wins. Moves fast, loses faster.",
    match: (scores, stats) => {
      const winRate = getScore(scores, "Win Rate");
      return winRate < 30 && stats.totalVolume > 5000;
    },
  },
  {
    emoji: "🔥",
    name: "THE CHAOS AGENT",
    title: "The Chaos Agent",
    description:
      "No pattern, no strategy, just pure vibes and volume. Somehow still alive.",
    match: (scores) => {
      const degen = getScore(scores, "Degen Index");
      const survival = getScore(scores, "Survival Rate");
      return degen > 60 && survival > 40;
    },
  },
  {
    emoji: "🧠",
    name: "THE DEGEN ARCHAEOLOGIST",
    title: "The Degen Archaeologist",
    description:
      "Digs through garbage looking for gems. Finds mostly garbage.",
    match: () => true,
  },
];

function getScore(scores: DimensionScore[], label: string): number {
  const found = scores.find((s) => s.label === label);
  return found ? found.score : 50;
}

/** Classifies wallet into one of 10 archetypes based on scores and activity */
export function classifyArchetype(
  scores: DimensionScore[],
  stats: WalletReport["stats"],
  lastActiveTimestamp?: number
): Archetype {
  for (const arch of ARCHETYPES) {
    if (arch.match(scores, stats, lastActiveTimestamp)) {
      return {
        emoji: arch.emoji,
        name: arch.name,
        title: arch.title,
        description: arch.description,
      };
    }
  }
  const fallback = ARCHETYPES[ARCHETYPES.length - 1];
  return {
    emoji: fallback.emoji,
    name: fallback.name,
    title: fallback.title,
    description: fallback.description,
  };
}

/** Returns all 10 archetypes for reference */
export function getAllArchetypes(): Archetype[] {
  return ARCHETYPES.map((a) => ({
    emoji: a.emoji,
    name: a.name,
    title: a.title,
    description: a.description,
  }));
}
