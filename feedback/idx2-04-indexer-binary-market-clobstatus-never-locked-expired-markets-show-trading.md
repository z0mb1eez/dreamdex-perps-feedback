# Event-contract Market.clobStatus never reports Locked (or Listed): markets 4 days past expiry show "Trading"; two are still unresolved on-chain
Severity: normal
Area: API

## Steps to reproduce
1. `{ Market(where:{marketType:{_eq:BINARY},clobStatus:{_eq:Trading},expiry:{_lt:"1793611000"}}){ id marketAddress binaryPoolAddress expiry clobStatus finalized voided tradeCount resolvedAtTimestamp } }` on https://dev.smk.somnia.host/v1/graphql.
2. For each `marketAddress` call `status()` (uint8), `payoutNumerators()`, `payoutDenominator()` on https://api.infra.testnet.somnia.network.
3. Count rows per status: `Market_aggregate(where:{marketType:{_eq:BINARY},clobStatus:{_eq:Locked}})` and `...{_eq:Listed}`.

## Expected
Per "Market Structure & Lifecycle" the states are Listed, Trading, Locked (window ended, awaiting settlement), Resolved, Voided, and "the indexed status lags by seconds". A market whose expiry has passed should not read Trading.

## Actual
- clobStatus counts for BINARY on Shannon: Trading 13, Finalized 237245, Voided 28, Locked 0, Listed 0 (mainnet: Trading 6, Finalized 59290, Voided 19, Locked 0, Listed 0). The Locked state never appears, so expired-but-unsettled markets are indistinguishable from live ones.
- Two testnet markets: `0x...037a28` (expiry 1793253900, market 0x126bfd82a185f78ecc4a526859814cd7accdac4f) and `0x...037a31` (expiry 1793253840, market 0x61453af181a1790068bdd59f97e4a402857881f1) are `clobStatus: Trading, finalized:false` about 4 days after expiry; on-chain `status()` = 2 (Locked) for both, `payoutNumerators()` = [] and `payoutDenominator()` = 10000000. They have not been resolved or voided although the docs state the oracle callback or the permissionless `voidExpired()` always ends a market (and no `statusUpdates` rows exist for them).
Because the on-chain status is time-derived, a client reading the indexer cannot tell tradable from locked markets without an RPC call.

## Environment
Node 22.23.4, viem 2.54.1, SHANNON indexer https://dev.smk.somnia.host/v1/graphql (chain 50312, RPC api.infra.testnet.somnia.network) and mainnet indexer https://prd.smk.somnia.host/v1/graphql (chain 5031, RPC api.infra.mainnet.somnia.network). Checked 2026-11-02 around unix 1793611400.
