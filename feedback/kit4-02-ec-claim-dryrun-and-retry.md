# dreamdex-bot-kit ec-core `claim.ts`: `redeemHoldings` documents "true ... in dry-run" but returns false (so `claimSettled` reports "nothing to claim"), and `maybeClaim` says "will retry" but does not retry for the whole interval
Severity: normal
Area: SDK

## Steps to reproduce
1. Save `b.mts` in a scratch dir (imports `packages/ec-core/src/claim.ts`; the exchange is a stub, nothing is sent):
```ts
import { redeemHoldings, claimSettled, maybeClaim } from "<kit>/packages/ec-core/src/claim.ts";
const me = "0x0000000000000000000000000000000000000001";
const onchain: any = { isResolved: true, isVoided: false, winningOutcome: 0, outcomeToken: me, yesId: 1n, noId: 2n, pool: me, marketAddress: me, decimals: 18, finalized: true };
const market: any = { symbol: "M", info: { marketType: "BINARY", marketId: "0x01" } };
const base: any = { canTrade: true, config: { dryRun: true, venueId: "v", addresses: {} },
  exchange: { walletAddress: me, trader: { redeem: async () => ({ hash: "0x1", receipt: { status: "success" } }) },
    client: { getMarketFees: async () => ({ settlementFeeBps: 100 }), getOutcomeBalance: async () => 10n ** 18n, getMarketOnchain: async () => onchain } } };
console.log("redeemHoldings dry-run ->", await redeemHoldings(base, market, onchain, { yes: 10n ** 18n, no: 0n }));
// 1) dry-run count
const withList = (f: any) => ({ ...base, exchange: { ...base.exchange, client: { ...base.exchange.client, listBinaryMarkets: f } } });
console.log("claimSettled dry-run ->", await claimSettled(withList(async () => [{ marketId: "0x01", symbol: "M", expiry: 1 }]), { verbose: true }));
// 2) retry after a failed sweep
process.env.AUTO_CLAIM_INTERVAL_MS = "600000";
let calls = 0;
const flaky = { ...withList(async () => { calls++; if (calls === 1) throw new Error("indexer hiccup"); return []; }), config: { dryRun: false, venueId: "v", addresses: {} } };
await maybeClaim(flaky); await maybeClaim(flaky);
console.log("indexer queries after two consecutive ticks:", calls);
```
2. `<kit>/node_modules/.bin/tsx b.mts`

## Expected
- `redeemHoldings` doc comment: "Returns true if anything was redeemed (or would have been, in dry-run)". A dry run that logs `DRY redeem ...` should return true, so `claimSettled` counts it and logs "claimed across 1 market(s)".
- `maybeClaim` doc comment: "Failures are swallowed ... and the next tick tries again", and it logs "sweep failed, will retry". The second tick should query the indexer again.

## Actual
```
DRY redeem 1.0000 YES M → ~0.9900 collateral
redeemHoldings dry-run -> false
claim: scanning 1 recently settled market(s) …
DRY redeem 1.0000 YES ? ?s @1 → ~0.9900 collateral
claim: nothing to claim.
claimSettled dry-run -> 0
claim: sweep failed, will retry — indexer hiccup
indexer queries after two consecutive ticks: 1
```
1. In dry run the function logs a claimable redemption and then returns `false`; `claimSettled` therefore prints "claim: nothing to claim." right after printing a `DRY redeem` line, contradicting itself.
2. `maybeClaim` sets `lastSweepAt = now` BEFORE the sweep. When the sweep throws (indexer hiccup, RPC error) the throttle is already armed, so the "retry" happens only after the full interval (default 10 minutes, `AUTO_CLAIM_INTERVAL_MS`). Settled tokens stay unclaimed for that long, while the log promises a retry.

## Evidence
`packages/ec-core/src/claim.ts`: `redeemHoldings` dry-run branch ends `return false;`; `maybeClaim` has `lastSweepAt = now;` above the `try { await claimSettled(...) }`. Suggested fix: return true in the dry-run branch; set `lastSweepAt` only after success (or reset it in the `catch`).

## Environment
dreamdex-bot-kit main, Node 22, tsx; stubbed exchange.
