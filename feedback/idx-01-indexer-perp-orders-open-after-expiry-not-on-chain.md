# Perps indexer keeps expired orders as status "Open" forever; they are not on the book on-chain
Severity: normal
Area: API

## Steps to reproduce
1. Query Open orders whose `expireTimestampNs` is more than 1 hour in the past (replace T with `now - 3600` in seconds):
```graphql
{ Order(where:{status:{_eq:Open}, expireTimestampNs:{_gt:0, _lt:"<T>000000000"}}, order_by:{expireTimestampNs:asc}, limit:3) { id market_id orderIdRaw expireTimestampNs placedAtTimestamp } }
```
POST to `https://hideki-dev.smk.somnia.host/v1/graphql`.
2. Page through the whole result (limit 1000 / offset), grouping by `market_id`.
3. For each affected pool, read the live book via eth_call on `https://api.hideki2.infra.testnet.somnia.network` with
`getAllOpenOrdersOffChain(bool isBid,uint256 maxCount,uint64 startCursor)` (both sides, follow `nextCursor`), decoding the Order struct from the Types docs (`uint128 orderId,bool isBid,address owner,uint64 userData,uint256 price,uint256 fullQuantity,uint256 quantityRemaining,uint64 expireTimestampNs`), and look for each `orderIdRaw`.
4. Positive control: for pool 0x705857... take indexer Open orders with `expireTimestampNs` in the future; all match the on-chain set.

## Expected
An order past its `expireTimestampNs` that is no longer on the book has a terminal status (Expired/Cancelled), so `status = Open` is a usable "resting orders" filter.

## Actual
Run at ~2026-11-02T05:00Z (unix 1793611257): 42 indexer orders are `Open` with `expireTimestampNs` more than an hour old (oldest 1791300708296000000, about 25 days old), spread over 6 pools (0x3d2a99 BNB: 16, 0x705857 XRP: 20, 0xb483ec SOL: 3, 0x1be212 SUI: 1, 0x34fa62 ADA: 1, 0x74b05b XLM: 1). None of the 42 are on the on-chain book (0 found, 42 absent). Example: `0x74b05b9b8c8f180b53b7891018f3b254b3e658c9_221360928884514893281`, `expireTimestampNs` 1791300708296000000, `quantityRemaining` 4650000000; XLM pool has 23 resting orders on-chain vs 24 `Open` in the indexer. The 24th is this one. Positive control: 21 of 21 fresh Open orders on XRP match on-chain.
Any client that treats `Open` as "on the book" (open-order lists, locked-margin estimates) over-counts.

## Evidence
Scripts used viem `readContract` with the ABI above and plain `fetch` POSTs; counts above are from one run, 2026-11-02. Distinct `Order.status` values could not be listed with `distinct_on:status` (returns `database query error`, code `unexpected`) - possibly a second minor bug.

## Environment
Node 22.23.4, viem 2.54.1, hideki-dev Hasura, chain 50383 RPC api.hideki2.infra.testnet.somnia.network.
