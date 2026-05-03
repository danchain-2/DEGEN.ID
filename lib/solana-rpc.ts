import type { BirdeyeTokenHolding, BirdeyeTransaction } from "./types";

const NATIVE_SOL_MINT = "So11111111111111111111111111111111111111112";
const SPL_TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhn6RQStH7U5FPkLczGdndbBYF77";
const ESTIMATED_SOL_PRICE_USD = 80;

function getRpcUrl(): string {
  return process.env.SOLANA_RPC_URL?.trim() || "https://api.mainnet-beta.solana.com";
}

interface RpcError {
  code: number;
  message: string;
}

interface RpcResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: RpcError;
}

interface GetBalanceResult {
  context: { slot: number };
  value: number;
}

interface ParsedTokenAmount {
  amount: string;
  decimals: number;
  uiAmount: number | null;
  uiAmountString: string;
}

interface ParsedTokenAccountInfo {
  mint: string;
  owner: string;
  tokenAmount: ParsedTokenAmount;
}

interface ParsedTokenAccountValue {
  pubkey: string;
  account: {
    data: {
      parsed: {
        info: ParsedTokenAccountInfo;
        type: string;
      };
      program: string;
    };
  };
}

interface GetTokenAccountsResult {
  context: { slot: number };
  value: ParsedTokenAccountValue[];
}

interface SignatureInfo {
  signature: string;
  slot: number;
  err: unknown;
  memo: string | null;
  blockTime: number | null;
  confirmationStatus: string | null;
}

interface TokenBalanceEntry {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: ParsedTokenAmount;
}

interface ParsedAccountKey {
  pubkey: string;
}

interface ParsedTransactionResult {
  slot: number;
  transaction: {
    signatures: string[];
    message: { accountKeys: ParsedAccountKey[] };
  };
  meta: {
    err: unknown;
    fee: number;
    preBalances?: number[];
    postBalances?: number[];
    preTokenBalances?: TokenBalanceEntry[];
    postTokenBalances?: TokenBalanceEntry[];
  } | null;
  blockTime: number | null;
}

async function rpcCall<T>(method: string, params: unknown[]): Promise<T | null> {
  const url = getRpcUrl();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    });
    if (!res.ok) {
      console.error(`Solana RPC ${method} HTTP ${res.status}`);
      return null;
    }
    const json = (await res.json()) as RpcResponse<T>;
    if (json.error) {
      console.error(`Solana RPC ${method} error: ${json.error.message}`);
      return null;
    }
    return json.result ?? null;
  } catch (err) {
    console.error(`Solana RPC ${method} network error:`, err);
    return null;
  }
}

export async function fetchSolanaHoldings(
  wallet: string
): Promise<BirdeyeTokenHolding[]> {
  const holdings: BirdeyeTokenHolding[] = [];

  const balanceResult = await rpcCall<GetBalanceResult>("getBalance", [
    wallet,
    { commitment: "confirmed" },
  ]);
  if (balanceResult && balanceResult.value > 0) {
    const lamports = balanceResult.value;
    holdings.push({
      address: NATIVE_SOL_MINT,
      symbol: "SOL",
      name: "Solana",
      decimals: 9,
      balance: lamports,
      uiAmount: lamports / 1e9,
      valueUsd: (lamports / 1e9) * ESTIMATED_SOL_PRICE_USD,
      priceUsd: ESTIMATED_SOL_PRICE_USD,
    });
  }

  const splResult = await rpcCall<GetTokenAccountsResult>(
    "getTokenAccountsByOwner",
    [wallet, { programId: SPL_TOKEN_PROGRAM }, { encoding: "jsonParsed" }]
  );
  if (splResult?.value) {
    for (const acct of splResult.value) {
      const info = acct.account.data.parsed.info;
      const uiAmount = info.tokenAmount.uiAmount ?? 0;
      if (uiAmount <= 0) continue;
      holdings.push({
        address: info.mint,
        symbol: "",
        name: "",
        decimals: info.tokenAmount.decimals,
        balance: Number(info.tokenAmount.amount),
        uiAmount,
        valueUsd: 0,
        priceUsd: 0,
      });
    }
  }

  try {
    const t22Result = await rpcCall<GetTokenAccountsResult>(
      "getTokenAccountsByOwner",
      [wallet, { programId: TOKEN_2022_PROGRAM }, { encoding: "jsonParsed" }]
    );
    if (t22Result?.value) {
      for (const acct of t22Result.value) {
        const info = acct.account.data.parsed.info;
        const uiAmount = info.tokenAmount.uiAmount ?? 0;
        if (uiAmount <= 0) continue;
        holdings.push({
          address: info.mint,
          symbol: "",
          name: "",
          decimals: info.tokenAmount.decimals,
          balance: Number(info.tokenAmount.amount),
          uiAmount,
          valueUsd: 0,
          priceUsd: 0,
        });
      }
    }
  } catch {
    // Token-2022 not supported on this RPC; skip silently
  }

  return holdings;
}

export async function fetchSolanaTransactions(
  wallet: string
): Promise<BirdeyeTransaction[]> {
  const transactions: BirdeyeTransaction[] = [];

  const signatures = await rpcCall<SignatureInfo[]>(
    "getSignaturesForAddress",
    [wallet, { limit: 40, commitment: "confirmed" }]
  );
  if (!signatures || signatures.length === 0) return transactions;

  const BATCH = 5;
  for (let i = 0; i < signatures.length; i += BATCH) {
    const batch = signatures.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((sig) =>
        rpcCall<ParsedTransactionResult>("getTransaction", [
          sig.signature,
          { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
        ])
      )
    );

    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const tx = result.value;
      if (!tx.meta || tx.meta.err) continue;

      const walletIndex = tx.transaction.message.accountKeys.findIndex(
        (key) => key.pubkey === wallet
      );
      if (walletIndex >= 0) {
        const preLamports = tx.meta.preBalances?.[walletIndex] ?? 0;
        const postLamports = tx.meta.postBalances?.[walletIndex] ?? 0;
        const solDelta = (postLamports - preLamports) / 1e9;
        if (Math.abs(solDelta) > 0.000001) {
          transactions.push({
            txHash: tx.transaction.signatures[0],
            blockUnixTime: tx.blockTime ?? 0,
            from: solDelta < 0 ? wallet : "",
            to: solDelta > 0 ? wallet : "",
            balanceChange: solDelta,
            tokenAddress: NATIVE_SOL_MINT,
            symbol: "SOL",
            side: solDelta > 0 ? "buy" : "sell",
            price: ESTIMATED_SOL_PRICE_USD,
            fee: tx.meta.fee / 1e9,
            volume: Math.abs(solDelta) * ESTIMATED_SOL_PRICE_USD,
          });
        }
      }

      const pre = tx.meta.preTokenBalances ?? [];
      const post = tx.meta.postTokenBalances ?? [];

      const preMap = new Map<string, number>();
      for (const tb of pre) {
        if (tb.owner === wallet) {
          preMap.set(`${tb.accountIndex}:${tb.mint}`, tb.uiTokenAmount.uiAmount ?? 0);
        }
      }

      const seen = new Set<string>();
      for (const tb of post) {
        if (tb.owner !== wallet) continue;
        const key = `${tb.accountIndex}:${tb.mint}`;
        seen.add(key);
        const preBal = preMap.get(key) ?? 0;
        const postBal = tb.uiTokenAmount.uiAmount ?? 0;
        const delta = postBal - preBal;
        if (delta === 0) continue;
        transactions.push({
          txHash: tx.transaction.signatures[0],
          blockUnixTime: tx.blockTime ?? 0,
          from: delta < 0 ? wallet : "",
          to: delta > 0 ? wallet : "",
          balanceChange: delta,
          tokenAddress: tb.mint,
          symbol: "",
          side: delta > 0 ? "buy" : "sell",
          price: 0,
          fee: tx.meta.fee / 1e9,
          volume: 0,
        });
      }

      for (const tb of pre) {
        if (tb.owner !== wallet) continue;
        const key = `${tb.accountIndex}:${tb.mint}`;
        if (seen.has(key)) continue;
        const preBal = tb.uiTokenAmount.uiAmount ?? 0;
        if (preBal <= 0) continue;
        transactions.push({
          txHash: tx.transaction.signatures[0],
          blockUnixTime: tx.blockTime ?? 0,
          from: wallet,
          to: "",
          balanceChange: -preBal,
          tokenAddress: tb.mint,
          symbol: "",
          side: "sell",
          price: 0,
          fee: tx.meta.fee / 1e9,
          volume: 0,
        });
      }
    }
  }

  return transactions;
}
