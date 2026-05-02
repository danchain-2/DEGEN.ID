import type {
  BirdeyeWalletData,
  DimensionScore,
  TradeRecord,
  TimelinePoint,
  WalletReport,
} from "./types";
import { classifyArchetype } from "./archetypes";
import { generateVerdict } from "./verdicts";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatDuration(ms: number): string {
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) return `${Math.round(ms / (1000 * 60))}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days)}d`;
  return `${Math.round(days / 30)}mo`;
}

function formatVolume(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(1)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

interface TokenTrade {
  tokenAddress: string;
  symbol: string;
  buyVolume: number;
  sellVolume: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  firstBuyTime: number;
  lastSellTime: number;
  buyCount: number;
  sellCount: number;
  currentPrice: number;
  holdingValue: number;
  isAlive: boolean;
  isEarlyEntry: boolean;
  peakPrice: number;
}

function buildTokenTrades(data: BirdeyeWalletData): TokenTrade[] {
  const tokenMap = new Map<string, TokenTrade>();

  for (const tx of data.transactions) {
    const addr = tx.tokenAddress;
    if (!addr) continue;

    let trade = tokenMap.get(addr);
    if (!trade) {
      const overview = data.tokenOverviews.get(addr);
      const security = data.tokenSecurities.get(addr);
      const currentPrice = data.tokenPrices.get(addr) ?? 0;
      const holding = data.holdings.find((h) => h.address === addr);
      const isNewListing = data.newListings.some((nl) => nl.address === addr);
      const ohlcv = data.tokenOhlcv.get(addr) ?? [];
      const peakPrice = ohlcv.length > 0 ? Math.max(...ohlcv.map((c) => c.h)) : currentPrice;

      const isAlive =
        currentPrice > 0 &&
        (overview ? overview.liquidity > 1000 : true) &&
        !(security && security.top10HolderPercent > 90);

      trade = {
        tokenAddress: addr,
        symbol: tx.symbol || overview?.symbol || "UNKNOWN",
        buyVolume: 0,
        sellVolume: 0,
        avgBuyPrice: 0,
        avgSellPrice: 0,
        firstBuyTime: 0,
        lastSellTime: 0,
        buyCount: 0,
        sellCount: 0,
        currentPrice,
        holdingValue: holding?.valueUsd ?? 0,
        isAlive,
        isEarlyEntry: isNewListing,
        peakPrice,
      };
      tokenMap.set(addr, trade);
    }

    const isBuy =
      tx.side === "buy" ||
      tx.side === "Buy" ||
      (tx.balanceChange && tx.balanceChange > 0);

    if (isBuy) {
      trade.buyVolume += Math.abs(tx.volume || tx.price * Math.abs(tx.balanceChange || 0));
      trade.buyCount++;
      if (!trade.firstBuyTime || tx.blockUnixTime < trade.firstBuyTime) {
        trade.firstBuyTime = tx.blockUnixTime;
      }
      if (tx.price > 0) {
        trade.avgBuyPrice =
          (trade.avgBuyPrice * (trade.buyCount - 1) + tx.price) / trade.buyCount;
      }
    } else {
      trade.sellVolume += Math.abs(tx.volume || tx.price * Math.abs(tx.balanceChange || 0));
      trade.sellCount++;
      if (tx.blockUnixTime > trade.lastSellTime) {
        trade.lastSellTime = tx.blockUnixTime;
      }
      if (tx.price > 0) {
        trade.avgSellPrice =
          (trade.avgSellPrice * (trade.sellCount - 1) + tx.price) /
          trade.sellCount;
      }
    }
  }

  for (const holding of data.holdings) {
    if (!tokenMap.has(holding.address) && holding.valueUsd > 0) {
      const overview = data.tokenOverviews.get(holding.address);
      const currentPrice = data.tokenPrices.get(holding.address) ?? holding.priceUsd;
      tokenMap.set(holding.address, {
        tokenAddress: holding.address,
        symbol: holding.symbol || overview?.symbol || "UNKNOWN",
        buyVolume: holding.valueUsd,
        sellVolume: 0,
        avgBuyPrice: currentPrice,
        avgSellPrice: 0,
        firstBuyTime: 0,
        lastSellTime: 0,
        buyCount: 1,
        sellCount: 0,
        currentPrice,
        holdingValue: holding.valueUsd,
        isAlive: currentPrice > 0,
        isEarlyEntry: false,
        peakPrice: currentPrice,
      });
    }
  }

  return Array.from(tokenMap.values());
}

function computePnl(trade: TokenTrade): { pnlPercent: number; pnlUsd: number } {
  if (trade.avgBuyPrice <= 0) return { pnlPercent: 0, pnlUsd: 0 };

  const effectiveSellPrice =
    trade.sellCount > 0 && trade.avgSellPrice > 0
      ? trade.avgSellPrice
      : trade.currentPrice;

  if (effectiveSellPrice <= 0) return { pnlPercent: -100, pnlUsd: -trade.buyVolume };

  const pnlPercent =
    ((effectiveSellPrice - trade.avgBuyPrice) / trade.avgBuyPrice) * 100;
  const pnlUsd = trade.sellVolume + trade.holdingValue - trade.buyVolume;

  return { pnlPercent, pnlUsd };
}

function scoreWinRate(trades: TokenTrade[]): { score: number; commentary: string } {
  if (trades.length === 0) return { score: 50, commentary: "No trades to evaluate." };

  const profitable = trades.filter((t) => computePnl(t).pnlPercent > 0).length;
  const rate = (profitable / trades.length) * 100;
  const score = clamp(Math.round(rate), 0, 100);

  let commentary: string;
  if (score > 70) commentary = "Consistently profitable. Suspiciously so.";
  else if (score > 50) commentary = "Above average. Not bad for a degen.";
  else if (score > 30) commentary = "More losses than wins. Classic.";
  else commentary = "Winning is apparently optional for this wallet.";

  return { score, commentary };
}

function scoreDiamondHands(trades: TokenTrade[]): { score: number; commentary: string } {
  const tradesWithHold = trades.filter(
    (t) => t.firstBuyTime > 0 && (t.lastSellTime > 0 || t.holdingValue > 0)
  );
  if (tradesWithHold.length === 0)
    return { score: 50, commentary: "Not enough data to measure patience." };

  const now = Math.floor(Date.now() / 1000);
  let totalHoldWeighted = 0;
  let totalWeight = 0;

  for (const t of tradesWithHold) {
    const endTime = t.lastSellTime > 0 ? t.lastSellTime : now;
    const holdSeconds = endTime - t.firstBuyTime;
    const weight = t.buyVolume || 1;
    totalHoldWeighted += holdSeconds * weight;
    totalWeight += weight;
  }

  const avgHoldSeconds = totalWeight > 0 ? totalHoldWeighted / totalWeight : 0;
  const avgHoldDays = avgHoldSeconds / 86400;

  const score = clamp(Math.round(Math.min(avgHoldDays * 3.3, 100)), 0, 100);

  let commentary: string;
  if (score > 75) commentary = "Diamond hands forged in fire. Or laziness.";
  else if (score > 50) commentary = "Decent hold times. Not a total paperhands.";
  else if (score > 25) commentary = "Sells faster than they buy. Nervous energy.";
  else commentary = "Average hold time measured in minutes. Calm down.";

  return { score, commentary };
}

function scoreEntryTiming(trades: TokenTrade[]): { score: number; commentary: string } {
  const scored = trades.filter((t) => t.avgBuyPrice > 0 && t.peakPrice > 0);
  if (scored.length === 0)
    return { score: 50, commentary: "Entry timing data insufficient." };

  let earlyCount = 0;
  for (const t of scored) {
    const entryRatio = t.avgBuyPrice / t.peakPrice;
    if (entryRatio < 0.4) earlyCount++;
  }

  const earlyNewEntries = trades.filter((t) => t.isEarlyEntry).length;
  const rawScore = (earlyCount / scored.length) * 70 + (earlyNewEntries / Math.max(trades.length, 1)) * 30;
  const score = clamp(Math.round(rawScore), 0, 100);

  let commentary: string;
  if (score > 70) commentary = "Gets in early. Like, suspiciously early.";
  else if (score > 45) commentary = "Sometimes early, sometimes FOMO. Human after all.";
  else commentary = "Consistently buys the top. It's a talent, honestly.";

  return { score, commentary };
}

function scoreExitDiscipline(trades: TokenTrade[]): { score: number; commentary: string } {
  const closedTrades = trades.filter((t) => t.sellCount > 0 && t.avgSellPrice > 0);
  if (closedTrades.length === 0)
    return { score: 50, commentary: "No exits recorded. Still holding everything." };

  let goodExits = 0;
  for (const t of closedTrades) {
    if (t.peakPrice > 0) {
      const exitRatio = t.avgSellPrice / t.peakPrice;
      if (exitRatio > 0.5) goodExits++;
    } else {
      const pnl = computePnl(t);
      if (pnl.pnlPercent > 0) goodExits++;
    }
  }

  const score = clamp(Math.round((goodExits / closedTrades.length) * 100), 0, 100);

  let commentary: string;
  if (score > 70) commentary = "Takes profit like a professional. Rare breed.";
  else if (score > 45) commentary = "Sometimes takes profit. Sometimes watches it evaporate.";
  else commentary = "Holds through the top and sells at the bottom. Every time.";

  return { score, commentary };
}

function scoreRiskAppetite(
  trades: TokenTrade[],
  totalPortfolioValue: number
): { score: number; commentary: string } {
  if (trades.length === 0 || totalPortfolioValue <= 0)
    return { score: 50, commentary: "Risk profile unclear." };

  const maxPosition = Math.max(...trades.map((t) => t.buyVolume));
  const ratio = maxPosition / totalPortfolioValue;
  const score = clamp(Math.round(ratio * 100), 0, 100);

  let commentary: string;
  if (score > 75) commentary = "Goes all-in like rent isn't due. Absolute degen.";
  else if (score > 45) commentary = "Moderate risk taker. Boring but alive.";
  else commentary = "Conservative position sizing. Are you sure this is Solana?";

  return { score, commentary };
}

function scoreDegenIndex(trades: TokenTrade[]): { score: number; commentary: string } {
  if (trades.length === 0)
    return { score: 0, commentary: "No degen activity detected." };

  const microCapCount = trades.filter((t) => {
    const isMicro = t.buyVolume < 1000;
    return isMicro || t.isEarlyEntry;
  }).length;

  const frequency = Math.min(trades.length / 10, 1) * 50;
  const microCapRatio = (microCapCount / trades.length) * 50;
  const score = clamp(Math.round(frequency + microCapRatio), 0, 100);

  let commentary: string;
  if (score > 75) commentary = "Touches every new token like it's a buffet.";
  else if (score > 45) commentary = "Selective degen. Picks garbage with standards.";
  else commentary = "Surprisingly restrained for someone on Solana.";

  return { score, commentary };
}

function scoreSurvivalRate(trades: TokenTrade[]): { score: number; commentary: string } {
  if (trades.length === 0)
    return { score: 100, commentary: "Nothing traded, nothing died." };

  const alive = trades.filter((t) => t.isAlive).length;
  const score = clamp(Math.round((alive / trades.length) * 100), 0, 100);

  let commentary: string;
  if (score > 75) commentary = "Most tokens survived. Good taste or good luck.";
  else if (score > 45) commentary = "Decent survival rate. Only half turned to dust.";
  else commentary = "A graveyard of dead tokens. You have a gift.";

  return { score, commentary };
}

function findBestAndWorstTrades(
  trades: TokenTrade[]
): { best: TradeRecord | null; worst: TradeRecord | null } {
  if (trades.length === 0) return { best: null, worst: null };

  let bestTrade: TokenTrade | null = null;
  let worstTrade: TokenTrade | null = null;
  let bestPnl = -Infinity;
  let worstPnl = Infinity;

  for (const t of trades) {
    const pnl = computePnl(t);
    if (pnl.pnlPercent > bestPnl) {
      bestPnl = pnl.pnlPercent;
      bestTrade = t;
    }
    if (pnl.pnlPercent < worstPnl) {
      worstPnl = pnl.pnlPercent;
      worstTrade = t;
    }
  }

  function toTradeRecord(t: TokenTrade | null): TradeRecord | null {
    if (!t) return null;
    const pnl = computePnl(t);
    const holdMs =
      t.firstBuyTime > 0 && t.lastSellTime > 0
        ? (t.lastSellTime - t.firstBuyTime) * 1000
        : 0;
    return {
      tokenSymbol: t.symbol,
      tokenAddress: t.tokenAddress,
      entryPrice: t.avgBuyPrice,
      exitPrice: t.avgSellPrice || t.currentPrice,
      pnlPercent: Math.round(pnl.pnlPercent * 100) / 100,
      pnlUsd: Math.round(pnl.pnlUsd * 100) / 100,
      holdDuration: formatDuration(holdMs),
      holdMs,
      entryTime: t.firstBuyTime * 1000,
      exitTime: t.lastSellTime * 1000,
    };
  }

  return { best: toTradeRecord(bestTrade), worst: toTradeRecord(worstTrade) };
}

function buildTimeline(data: BirdeyeWalletData): TimelinePoint[] {
  const dayMap = new Map<string, { volume: number; trades: number }>();

  for (const tx of data.transactions) {
    const date = new Date(tx.blockUnixTime * 1000).toISOString().slice(0, 10);
    const existing = dayMap.get(date) ?? { volume: 0, trades: 0 };
    existing.volume += Math.abs(tx.volume || 0);
    existing.trades += 1;
    dayMap.set(date, existing);
  }

  const entries = Array.from(dayMap.entries()).sort(
    (a, b) => a[0].localeCompare(b[0])
  );

  if (entries.length === 0) return [];

  const maxVolume = Math.max(...entries.map(([, v]) => v.volume));
  const peakThreshold = maxVolume * 0.8;

  return entries.map(([date, v]) => ({
    date,
    volume: Math.round(v.volume * 100) / 100,
    trades: v.trades,
    isPeak: v.volume >= peakThreshold,
  }));
}

/** Scores a wallet across 7 dimensions and generates a full WalletReport */
export function scoreWallet(
  data: BirdeyeWalletData,
  address: string
): WalletReport {
  const trades = buildTokenTrades(data);

  if (trades.length === 0 && data.holdings.length === 0) {
    return {
      address,
      archetype: {
        emoji: "👻",
        name: "UNKNOWN",
        title: "Ghost",
        description: "No activity detected.",
      },
      verdict: "This wallet has never touched a token. Respectable, honestly.",
      scores: [],
      stats: { winRate: 0, totalVolume: 0, tokensTouched: 0, avgHoldTime: "0m" },
      bestTrade: null,
      worstTrade: null,
      timeline: [],
      generatedAt: new Date().toISOString(),
      isEmpty: true,
    };
  }

  const totalPortfolioValue = data.holdings.reduce(
    (sum, h) => sum + (h.valueUsd || 0),
    0
  );

  const winRateResult = scoreWinRate(trades);
  const diamondResult = scoreDiamondHands(trades);
  const entryResult = scoreEntryTiming(trades);
  const exitResult = scoreExitDiscipline(trades);
  const riskResult = scoreRiskAppetite(trades, totalPortfolioValue);
  const degenResult = scoreDegenIndex(trades);
  const survivalResult = scoreSurvivalRate(trades);

  const scores: DimensionScore[] = [
    { label: "Win Rate", score: winRateResult.score, commentary: winRateResult.commentary },
    { label: "Diamond Hands Score", score: diamondResult.score, commentary: diamondResult.commentary },
    { label: "Entry Timing", score: entryResult.score, commentary: entryResult.commentary },
    { label: "Exit Discipline", score: exitResult.score, commentary: exitResult.commentary },
    { label: "Risk Appetite", score: riskResult.score, commentary: riskResult.commentary },
    { label: "Degen Index", score: degenResult.score, commentary: degenResult.commentary },
    { label: "Survival Rate", score: survivalResult.score, commentary: survivalResult.commentary },
  ];

  const totalVolume = trades.reduce(
    (sum, t) => sum + t.buyVolume + t.sellVolume,
    0
  );
  const profitableTrades = trades.filter((t) => computePnl(t).pnlPercent > 0).length;
  const winRate = trades.length > 0 ? Math.round((profitableTrades / trades.length) * 100) : 0;

  const now = Math.floor(Date.now() / 1000);
  const avgHoldMs = trades.reduce((sum, t) => {
    const endTime = t.lastSellTime > 0 ? t.lastSellTime : now;
    return sum + (t.firstBuyTime > 0 ? (endTime - t.firstBuyTime) * 1000 : 0);
  }, 0) / Math.max(trades.length, 1);

  const stats = {
    winRate,
    totalVolume: Math.round(totalVolume * 100) / 100,
    tokensTouched: trades.length,
    avgHoldTime: formatDuration(avgHoldMs),
  };

  const lastActiveTs = data.transactions.length > 0
    ? Math.max(...data.transactions.map((tx) => tx.blockUnixTime)) * 1000
    : undefined;

  const archetype = classifyArchetype(scores, stats, lastActiveTs);
  const verdict = generateVerdict(archetype, scores);
  const { best, worst } = findBestAndWorstTrades(trades);
  const timeline = buildTimeline(data);

  return {
    address,
    archetype,
    verdict,
    scores,
    stats: {
      ...stats,
      totalVolume: Math.round(totalVolume * 100) / 100,
    },
    bestTrade: best,
    worstTrade: worst,
    timeline,
    generatedAt: new Date().toISOString(),
  };
}

/** Generates a deterministic demo report from a wallet address for when no API key is available */
export function generateDemoReport(address: string): WalletReport {
  const seed = address.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const r = (min: number, max: number) => min + (seed % (max - min + 1));

  const scores: DimensionScore[] = [
    { label: "Win Rate", score: r(20, 75), commentary: "Demo mode — connect Birdeye API for real data." },
    { label: "Diamond Hands Score", score: r(15, 80), commentary: "Demo mode — connect Birdeye API for real data." },
    { label: "Entry Timing", score: r(25, 70), commentary: "Demo mode — connect Birdeye API for real data." },
    { label: "Exit Discipline", score: r(10, 65), commentary: "Demo mode — connect Birdeye API for real data." },
    { label: "Risk Appetite", score: r(30, 85), commentary: "Demo mode — connect Birdeye API for real data." },
    { label: "Degen Index", score: r(40, 90), commentary: "Demo mode — connect Birdeye API for real data." },
    { label: "Survival Rate", score: r(20, 70), commentary: "Demo mode — connect Birdeye API for real data." },
  ];

  const volumeFormatted = `$${(r(1000, 500000)).toLocaleString()}`;
  const stats = {
    winRate: r(20, 75),
    totalVolume: r(1000, 500000),
    tokensTouched: r(5, 80),
    avgHoldTime: `${r(1, 30)}d`,
  };

  const archetype = classifyArchetype(scores, stats);
  const verdict = generateVerdict(archetype, scores);

  const demoTimeline: TimelinePoint[] = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const vol = r(100, 10000) + (i * seed) % 5000;
    return {
      date: date.toISOString().slice(0, 10),
      volume: vol,
      trades: r(1, 15),
      isPeak: i === 7 || i === 11,
    };
  });

  return {
    address,
    archetype,
    verdict,
    scores,
    stats,
    bestTrade: {
      tokenSymbol: "BONK",
      tokenAddress: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
      entryPrice: 0.000001,
      exitPrice: 0.000025,
      pnlPercent: 2400,
      pnlUsd: r(500, 15000),
      holdDuration: `${r(2, 14)}d`,
      holdMs: r(2, 14) * 86400000,
      entryTime: Date.now() - 30 * 86400000,
      exitTime: Date.now() - 16 * 86400000,
    },
    worstTrade: {
      tokenSymbol: "RUGME",
      tokenAddress: "So11111111111111111111111111111111111111112",
      entryPrice: 0.05,
      exitPrice: 0.0001,
      pnlPercent: -99.8,
      pnlUsd: -r(200, 5000),
      holdDuration: `${r(1, 5)}d`,
      holdMs: r(1, 5) * 86400000,
      entryTime: Date.now() - 45 * 86400000,
      exitTime: Date.now() - 40 * 86400000,
    },
    timeline: demoTimeline,
    generatedAt: new Date().toISOString(),
    demoMode: true,
  };
}

export { formatVolume };
