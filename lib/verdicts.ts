import type { Archetype, DimensionScore } from "./types";

interface VerdictRule {
  condition: (archetype: Archetype, scores: DimensionScore[]) => boolean;
  verdict: string;
}

function getScore(scores: DimensionScore[], label: string): number {
  const found = scores.find((s) => s.label === label);
  return found ? found.score : 50;
}

const VERDICT_RULES: VerdictRule[] = [
  {
    condition: (a) => a.name === "THE APEX SNIPER",
    verdict: "Either you're a bot or the rest of us need to retire.",
  },
  {
    condition: (a) => a.name === "THE SILENT WHALE",
    verdict: "Your wallet speaks louder than your words ever could.",
  },
  {
    condition: (a) => a.name === "THE DIAMOND MONK",
    verdict: "Holding so long the tokens forgot you owned them.",
  },
  {
    condition: (a) => a.name === "THE PERPETUAL BAGHOLDER",
    verdict: "Loyalty is a virtue. In trading, it's a liability.",
  },
  {
    condition: (a) => a.name === "THE CASINO GHOST",
    verdict: "The house always wins. You always play.",
  },
  {
    condition: (a) => a.name === "THE PAPER HAND PROPHET",
    verdict: "Sold the bottom. Every. Single. Time.",
  },
  {
    condition: (a) => a.name === "THE CHAOS AGENT",
    verdict: "No strategy detected. Somehow still breathing.",
  },
  {
    condition: (a) => a.name === "THE HIBERNATOR",
    verdict: "Gone but not forgotten. Your bags remain.",
  },
  {
    condition: (a) => a.name === "THE ONE-HIT WONDER",
    verdict: "One trade defined you. The rest just confused you.",
  },
  {
    condition: (a, s) =>
      a.name === "THE DEGEN ARCHAEOLOGIST" && getScore(s, "Degen Index") > 70,
    verdict: "Digging through the ruins of dead tokens with unmatched dedication.",
  },
  {
    condition: (a) => a.name === "THE DEGEN ARCHAEOLOGIST",
    verdict: "Funds are safu. Decisions are not.",
  },
  {
    condition: (_, s) => getScore(s, "Win Rate") > 80,
    verdict: "Your win rate is suspicious. Are you from the future?",
  },
  {
    condition: (_, s) => getScore(s, "Win Rate") < 20,
    verdict: "At this point, a random number generator would outperform you.",
  },
  {
    condition: (_, s) => getScore(s, "Degen Index") > 85,
    verdict: "You don't trade tokens. You collect regret.",
  },
  {
    condition: (_, s) => getScore(s, "Survival Rate") < 25,
    verdict: "Everything you touch turns to zero. It's almost impressive.",
  },
];

const FALLBACK_VERDICTS = [
  "Funds are safu. Decisions are not.",
  "Your wallet tells a story. It's a horror story.",
  "Somewhere between genius and gambler. Closer to gambler.",
  "The blockchain remembers everything. Even the things you'd rather forget.",
  "Trading is easy. Being good at it is apparently optional.",
];

/** Generates a savage but accurate one-line verdict based on archetype and scores */
export function generateVerdict(
  archetype: Archetype,
  scores: DimensionScore[]
): string {
  for (const rule of VERDICT_RULES) {
    if (rule.condition(archetype, scores)) {
      return rule.verdict;
    }
  }
  const hash = archetype.name
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return FALLBACK_VERDICTS[hash % FALLBACK_VERDICTS.length];
}
