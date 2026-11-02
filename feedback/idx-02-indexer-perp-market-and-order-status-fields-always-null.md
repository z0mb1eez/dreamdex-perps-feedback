# Perp rows in the indexer: Market.perpStatus/perpRestricted/clobStatus/marketId and Order.pool/Order.side are null, though on-chain state exists
Severity: normal
Area: API

## Steps to reproduce
1. Introspect `Market` on `https://hideki-dev.smk.somnia.host/v1/graphql`: it has `perpStatus: String`, `perpRestricted: Boolean`, `perpRegistered: Boolean`, `clobStatus`, `marketId`, `asset`, `tradingStart`, `expiry`.
2. Run:
```graphql
{ p:Market(where:{marketType:{_eq:PERP}}){ perpStatus perpRestricted clobStatus marketId asset tradingStart expiry perpRegistered } }
```
3. Compare with chain: for each pool call `getMarketStatus()` (uint8) and `isRestricted()` via eth_call on api.hideki2.infra.testnet.somnia.network (ABI in SDK `readsAbi.ts` perpPoolReadAbi).
4. Also: `{ Order(limit:2, order_by:{placedAtTimestamp:desc}){ id pool side isBid market_id } }` and `{ Fill(limit:2,order_by:{timestamp:desc}){ id kind makerSide takerSide takerIsBid marketType } }`.

## Expected
Fields that exist on the type carry the pool's state: `perpStatus` ~ Active/ReduceOnly/Settlement/Delisted, `perpRestricted` = false, etc.; `Order.pool`/`Order.side` filled (or documented as spot-only).

## Actual
- All 21 PERP markets: `perpStatus`, `perpRestricted`, `clobStatus`, `marketId`, `asset`, `tradingStart`, `expiry` are null (0 of 21 rows have any non-null value); only `perpRegistered` is true. On-chain every pool returns `getMarketStatus()=0` and `isRestricted()=false`. SPOT rows have `clobStatus`/`marketId` null too; BINARY rows have them populated ("Finalized").
- Perp `Order` rows: `pool` and `side` null (only `market_id` and `isBid` set); `Order.pool` is non-null only for other (non-perp) rows.
- Perp `Fill` rows: `kind`, `makerSide`, `takerSide` null (only `takerIsBid`); these enums are populated only for binary fills (`DIRECT_YES`, `BUY_YES`).
- Empty tables despite 21 registered pools: `PerpTwapSample` (0 rows), `PerpSettlementPairing` (0 rows). `PerpMarketLifecycleEvent` has only 21 `PoolRegistered` rows with ~20 columns always null. (Plausibly just "no events yet", noted for completeness.)
SDK `UnifiedMarket.perpStatus` therefore has to come from chain reads, and the `Market.perpStatus` column cannot be used as a "tradeable" filter.

## Evidence
Checked 2026-11-02 against chain_metadata head 39577466+ (indexer in sync with RPC head within ~100 blocks). All other checked perp aggregates matched chain exactly: Market.fundingRate, openInterest, cumulativeFundingPerUnit, tick/lot/minQuantity, initialMargin, funding window/interval for all 21 pools; PerpPoolParametersEpoch latest row vs `getPerpPoolParameters()` (all 21); 60s Candle OHLC/volume/tradeCount vs summed Fills (126 candles, 0 mismatches); REST /v0/markets/{symbol}/volume vs summed Shannon fills (exact). Mark/index prices differ only by normal time drift.

## Environment
Node 22.23.4, viem 2.54.1.
