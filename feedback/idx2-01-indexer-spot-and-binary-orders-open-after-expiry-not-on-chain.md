# Spot and event-contract (binary) orders stay status "Open" long after expireTimestampNs on Shannon and mainnet indexers; none are on the on-chain book
Severity: normal
Area: API

## Steps to reproduce
1. On either indexer (POST `/v1/graphql`), page through all orders that are Open but expired more than an hour ago (T = now - 3600, seconds):
```graphql
{ Order(where:{status:{_eq:Open}, expireTimestampNs:{_gt:0,_lt:"<T>000000000"}}, order_by:[{expireTimestampNs:asc},{id:asc}], limit:1000, offset:0) { id market_id orderIdRaw expireTimestampNs quantityRemaining market{marketType binaryPoolAddress} } }
```
2. Group by pool (`market_id` for SPOT, `market.binaryPoolAddress` for BINARY). For each pool call `getAllOpenOrdersOffChain(bool isBid,uint256 maxCount,uint64 startCursor)` for both sides following `nextCursor` (ABI per the Types doc: `uint128 orderId,bool isBid,address owner,uint64 userData,uint256 price,uint256 fullQuantity,uint256 quantityRemaining,uint64 expireTimestampNs`) and look for each `orderIdRaw`.

## Expected
An order past its expiry that is no longer on the book has a terminal status (Expired), so `status = Open` can be used as "resting orders".

## Actual
- Shannon (50312): 14151 stale Open orders: 15 SPOT (3 pools), 13903 BINARY (2554 pools), 233 PERP. Oldest SPOT example: `0x3605f28aa7c50e7441211e77cb0762d49539326c_166020696663400529499` (WBTC:USDso), `expireTimestampNs` 1784278392934025724 (about 3.5 months old). SPOT pools: WBTC 1, SOMI 6, WETH 8 stale; 0 of these are on the on-chain book (books hold 14/15/10 live orders). BINARY: first 60 pools / 576 orders checked on-chain, 0 present (market statuses of the 13903: 11718 Finalized, 2167 Finalized+voided, 15 Voided, 3 Trading).
- Mainnet (5031): 153 stale Open orders: 52 SPOT (USDC.e 5, SOMI 45, WETH 2), 101 BINARY (50 pools). All 153 checked on-chain, 0 present. Oldest: `0x47fd2f18426f67106dbac82f6d21d446c5f2120b_147573952589678019581` (USDC.e:USDso), expireTimestampNs 1779826959416000000. WETH pool: 33 live orders on-chain, 2 stale Open in the indexer.
So orders that expire without being touched are never transitioned to Expired. Any client counting Open orders (locked-balance estimates, open-order lists, book reconstruction from the indexer) over-counts. (Same pattern as the perp report on the hideki indexer, now on spot, event contracts and both networks.)

## Evidence
Scripts used viem readContract on the pools plus fetch POSTs; positive control: unexpired Open orders on the same pools match the on-chain set. Orders with status Expired exist (e.g. `{Order(limit:1,where:{market_id:{_eq:"0xa936da11b57b50a344e1293aaae5232885ea2bde"},status:{_eq:Expired}}){id}}`), so the status is supported but not applied to these.

## Environment
Node 22.23.4, viem 2.54.1, SHANNON indexer https://dev.smk.somnia.host/v1/graphql (chain 50312, RPC api.infra.testnet.somnia.network) and mainnet indexer https://prd.smk.somnia.host/v1/graphql (chain 5031, RPC api.infra.mainnet.somnia.network). Checked 2026-11-02 around unix 1793611400.
