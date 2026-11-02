# Market.precision.amount is 0 for DOGE, PUMP and 1000PEPE although their lot is 10 or 100 whole base units
Severity: normal
Area: SDK

## Steps to reproduce
1. Setup: `mkdir repro && cd repro && npm init -y && npm pkg set type=module && npm i viem @somnia-chain/markets-sdk@0.32.1`
2. Run (`ex2.mjs`):
```js
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
const ex = new SomniaMarkets({ chain: hidekiTestnet, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES })
await ex.loadMarkets()
for (const k of ["DOGE/USDso:USDso", "PUMP/USDso:USDso", "1000PEPE/USDso:USDso"]) {
  const m = ex.markets[k]
  console.log(k, "precision", JSON.stringify(m.precision), "lotSize", m.info.lotSize, "baseDecimals", m.info.baseDecimals,
    "min", m.limits.amount.min, "amountToPrecision(12345)", ex.amountToPrecision(k, 12345))
}
process.exit(0)
```

## Expected
`precision.amount` (typed as "Amount decimal places implied by the lot grid") should let a ccxt-style consumer land on-lot. For DOGE the pool's lot is 1e9 raw at 8 decimals = 10 DOGE, so valid sizes are multiples of 10.

## Actual
```
DOGE/USDso:USDso precision {"price":5,"amount":0} lotSize 1000000000 baseDecimals 8 min 120 amountToPrecision(12345) 12340
PUMP/USDso:USDso precision {"price":6,"amount":0} lotSize 100000000 baseDecimals 6 min 1800 amountToPrecision(12345) 12300
1000PEPE/USDso:USDso precision {"price":7,"amount":0} lotSize 100000000000000000000 baseDecimals 18 min 2700 amountToPrecision(12345) 12300
```
`precisionFromStep` (unified/structs.ts) clamps negative places to 0, so a lot of 10 or 100 whole units is reported as "integers". A ccxt consumer that rounds to `precision.amount` decimals (the default ccxt DECIMAL_PLACES mode) gets 12345 DOGE, which is off-lot. `amountToPrecision` itself is right (12340, uses the raw lot). Suggest exposing the step (e.g. `precision.amount = 10` with a TICK_SIZE `precisionMode`, or a `lotSize` in human units on the market) and documenting that `precision.*` is lossy when the grid is coarser than 1 unit. All other 18 perp markets were checked against `getOrderBookParameters()` and match.

## Environment
- SDK @somnia-chain/markets-sdk 0.32.1
- Hideki testnet, chain id 50383 (pools DOGE 0xc41001..., PUMP 0x76c981..., 1000PEPE 0xfa9b9e...; tick/lot/oneBase read via `getOrderBookParameters`/`getOneBase`)
- node v22, Linux, 2026-11-02 (UTC), read-only
