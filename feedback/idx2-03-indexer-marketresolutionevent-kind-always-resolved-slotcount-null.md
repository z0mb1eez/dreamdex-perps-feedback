# MarketResolutionEvent: kind is "Resolved" even for voided markets, and outcomeSlotCount is always null (both networks)
Severity: normal
Area: API

## Steps to reproduce
1. `{ a:MarketResolutionEvent(limit:2,where:{voided:{_eq:true}}){id kind voided outcomeSlotCount payoutNumerators} b:MarketResolutionEvent(limit:2,where:{kind:{_neq:Resolved}}){id} c:MarketResolutionEvent(limit:2,where:{outcomeSlotCount:{_is_null:false}}){id} }`
2. Run on https://dev.smk.somnia.host/v1/graphql and https://prd.smk.somnia.host/v1/graphql.
3. Also fetch the latest 5000 events (`order_by:{timestamp:desc}, limit:5000`) and count by (kind, voided, outcomeSlotCount).

## Expected
`kind` distinguishes resolution from void (the docs describe Resolved and Voided as separate end states) and `outcomeSlotCount` is filled (it is a column of the type; Market.outcomeSlotCount is 2 for these markets).

## Actual
- (a) returns rows with `"kind":"Resolved","voided":true,"payoutNumerators":["5000000","5000000"]` on both networks (e.g. testnet `441850956_34`, mainnet `428247929_20`).
- (b) and (c) return empty lists on both: no event has any kind other than Resolved, and `outcomeSlotCount` is null in every event (latest 5000 on each network: all kind=Resolved, all outcomeSlotCount=null).
Consumers must use the separate boolean `voided` and cannot rely on `kind`.

## Evidence
Payout vectors on events match Market.payoutNumerators where both are present (0 mismatches in 5000 events per network).

## Environment
Node 22.23.4, viem 2.54.1, SHANNON indexer https://dev.smk.somnia.host/v1/graphql (chain 50312, RPC api.infra.testnet.somnia.network) and mainnet indexer https://prd.smk.somnia.host/v1/graphql (chain 5031, RPC api.infra.mainnet.somnia.network). Checked 2026-11-02 around unix 1793611400.
