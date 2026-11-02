# Shannon indexer: 477 voided event-contract markets have null payoutNumerators/payoutDenominator and no MarketResolutionEvent
Severity: normal
Area: API

## Steps to reproduce
1. `{ Market_aggregate(where:{marketType:{_eq:BINARY},voided:{_eq:true}}){aggregate{count}} n:Market_aggregate(where:{marketType:{_eq:BINARY},voided:{_eq:true},payoutNumerators:{_is_null:true}}){aggregate{count}} }` on https://dev.smk.somnia.host/v1/graphql.
2. Example: `{ Market_by_pk(id:"0x00000000000000000000000000000000000000000000000000000000000001e1"){ marketAddress clobStatus finalized voided payoutNumerators payoutDenominator settledPayoutNumerators winningOutcome resolvedAtTimestamp } MarketResolutionEvent(where:{market_id:{_eq:"0x00000000000000000000000000000000000000000000000000000000000001e1"}}){id} }`
3. On chain, market contract 0x1ffdf9069e56be2325c62b347ada8673e2fcea8f: `status()`, `payoutNumerators()`, `payoutDenominator()` (ABI from @somnia-chain/markets-sdk machineryAbi/market ABI).

## Expected
A voided market carries the payout vector the docs tell integrators to read ("Read the payout from payoutNumerators / payoutDenominator rather than assuming a half", Market Structure & Lifecycle) and has a resolution event, like the other voided markets.

## Actual
- Total voided BINARY markets 1989; 477 have `payoutNumerators` and `payoutDenominator` null (second count query). Their `settledPayoutNumerators` is populated (["5000000","5000000"]) so the data exists, but `payoutNumerators` is null.
- Market 0x...01e1: `payoutNumerators: null, payoutDenominator: null, settledPayoutNumerators: ["5000000","5000000"], winningOutcome: null`; `MarketResolutionEvent` for it returns []. On-chain: status()=5 (Voided), payoutNumerators()=[5000000,5000000], payoutDenominator()=10000000.
- Of the first 1000 voided markets fetched, 396 have null payout and 0 of those have a MarketResolutionEvent (checked with `MarketResolutionEvent(where:{market_id:{_in:[...]}})`); 591 markets have events. Voided markets that did get an event have payouts populated, so the missing ones look like the `voidExpired()` backstop path not being indexed into these columns.
- Mainnet: 25 voided, 0 with null payout (not affected so far).
A client that redeems/estimates from `payoutNumerators`/`payoutDenominator` (the SDK's `voidPayoutFraction` reads them) gets null for these markets.

## Evidence
Spot-check of payouts on 25 recent Resolved testnet and 25 finalized mainnet markets: indexer payoutNumerators/payoutDenominator and on-chain status (4 or 5) all matched, 0 mismatches.

## Environment
Node 22.23.4, viem 2.54.1, SHANNON indexer https://dev.smk.somnia.host/v1/graphql (chain 50312, RPC api.infra.testnet.somnia.network) and mainnet indexer https://prd.smk.somnia.host/v1/graphql (chain 5031, RPC api.infra.mainnet.somnia.network). Checked 2026-11-02 around unix 1793611400.
