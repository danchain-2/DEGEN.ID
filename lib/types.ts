export interface TradeRecord {
  tokenSymbol: string;
  tokenAddress: string;
  entryPrice: number;
  exitPrice: number;
  pnlPercent: number;
  pnlUsd: number;
  holdDuration: string;
  holdMs: number;
  entryTime: number;
  exitTime: number;
}

export interface DimensionScore {
  label: string;
  score: number;
  commentary: string;
}

export interface TimelinePoint {
  date: string;
  volume: number;
  trades: number;
  isPeak: boolean;
}

export interface Archetype {
  emoji: string;
  name: string;
  title: string;
  description: string;
}

export interface WalletReport {
  address: string;
  archetype: Archetype;
  verdict: string;
  scores: DimensionScore[];
  stats: {
    winRate: number;
    totalVolume: number;
    tokensTouched: number;
    avgHoldTime: string;
  };
  bestTrade: TradeRecord | null;
  worstTrade: TradeRecord | null;
  timeline: TimelinePoint[];
  generatedAt: string;
  demoMode?: boolean;
  isEmpty?: boolean;
}

export interface BirdeyeTokenHolding {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: number;
  uiAmount: number;
  valueUsd: number;
  priceUsd: number;
}

export interface BirdeyeTransaction {
  txHash: string;
  blockUnixTime: number;
  from: string;
  to: string;
  balanceChange: number;
  tokenAddress: string;
  symbol: string;
  side: string;
  price: number;
  fee: number;
  volume: number;
}

export interface BirdeyeTokenOverview {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  liquidity: number;
  mc: number;
  price: number;
  v24hUSD: number;
  createdAt: number;
}

export interface BirdeyeTokenSecurity {
  address: string;
  isToken2022: boolean;
  top10HolderPercent: number;
  isMutable: boolean;
  totalSupply: number;
  creatorAddress: string;
  creatorBalance: number;
  ownerAddress: string;
  ownerBalance: number;
}

export interface BirdeyeOHLCV {
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  unixTime: number;
}

export interface BirdeyeNewListing {
  address: string;
  symbol: string;
  name: string;
  createdAt: number;
  liquidity: number;
}

export interface BirdeyePrice {
  value: number;
  updateUnixTime: number;
  updateHumanTime: string;
}

export interface BirdeyeWalletData {
  holdings: BirdeyeTokenHolding[];
  transactions: BirdeyeTransaction[];
  tokenOverviews: Map<string, BirdeyeTokenOverview>;
  tokenSecurities: Map<string, BirdeyeTokenSecurity>;
  tokenPrices: Map<string, number>;
  tokenOhlcv: Map<string, BirdeyeOHLCV[]>;
  newListings: BirdeyeNewListing[];
}

export interface CachedReport {
  address: string;
  report: string;
  createdAt: number;
  updatedAt: number;
}

export interface LeaderboardEntry {
  address: string;
  archetype: Archetype;
  winRate: number;
  totalVolume: number;
  degenIndex: number;
  diamondHandsScore: number;
  demoMode?: boolean;
}
