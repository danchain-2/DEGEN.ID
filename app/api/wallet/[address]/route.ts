import { NextResponse } from "next/server";
import { fetchAllWalletData } from "@/lib/birdeye";
import { scoreWallet, generateDemoReport } from "@/lib/scorer";
import { getCachedReport, cacheReport } from "@/lib/db";

const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function isValidSolanaAddress(addr: string): boolean {
  const trimmed = addr.trim();
  return BASE58_REGEX.test(trimmed) && trimmed.length >= 32 && trimmed.length <= 44;
}

/** GET /api/wallet/[address] — validates address, checks cache, fetches, scores, caches, returns report */
export async function GET(
  _request: Request,
  { params }: { params: { address: string } }
): Promise<NextResponse> {
  const address = params.address.trim();

  if (!isValidSolanaAddress(address)) {
    return NextResponse.json(
      { error: "Invalid Solana wallet address." },
      { status: 400 }
    );
  }

  const cached = getCachedReport(address);
  if (cached) {
    return NextResponse.json(cached);
  }

  const apiKey = process.env.BIRDEYE_API_KEY;
  if (!apiKey) {
    const demo = generateDemoReport(address);
    cacheReport(demo);
    return NextResponse.json(demo);
  }

  try {
    const walletData = await fetchAllWalletData(address);

    if (!walletData) {
      const demo = generateDemoReport(address);
      demo.demoMode = true;
      cacheReport(demo);
      return NextResponse.json(demo);
    }

    const report = scoreWallet(walletData, address);
    cacheReport(report);
    return NextResponse.json(report);
  } catch (err) {
    console.error("Wallet analysis error:", err);
    return NextResponse.json(
      { error: "Failed to analyse wallet. Please try again." },
      { status: 500 }
    );
  }
}
