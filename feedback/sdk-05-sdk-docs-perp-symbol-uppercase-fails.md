# PERPS.md and EXCHANGE.md use symbol "BTC/USDSO:USDSO", which the exchange API rejects; the real symbol is "BTC/USDso:USDso"
Severity: normal
Area: docs

## Steps to reproduce
1. Setup: `mkdir repro && cd repro && npm init -y && npm pkg set type=module && npm i viem @somnia-chain/markets-sdk@0.32.1`
2. Docs in the package: `docs/PERPS.md` lines 3, 1197-1200 (Quick start: `exchange.depositMargin("BTC/USDSO:USDSO", ...)`, `createOrder("BTC/USDSO:USDSO", ...)`, `fetchFundingRate("BTC/USDSO:USDSO")`) and `docs/EXCHANGE.md` line 39 (Perp symbol `BTC/USDSO:USDSO`). `docs/reference/symbols.md` says the opposite: `BTC/USDso:USDso`, case preserved.
3. Run (`r5.mjs`):
```js
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
const ex = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES })
await ex.loadMarkets()
console.log("UTC", new Date().toISOString())
for (const s of ["BTC/USDSO:USDSO", "BTC/USDso:USDso"]) {
  try { const r = await ex.fetchFundingRate(s); console.log(s, "->", r.symbol, r.fundingRate) }
  catch (e) { console.log(s, "->", e.constructor.name + ":", e.message) }
}
process.exit(0)
```

## Expected
The documented Quick-start symbol resolves (or the docs use the symbol the SDK synthesises).

## Actual
`BTC/USDSO:USDSO` throws `InvalidInputError ... unknown symbol BTC/USDSO:USDSO` even after `loadMarkets()` has completed. The error text says "call loadMarkets() first", which is misleading here because markets are loaded (the real problem is the casing). `ex.symbols` contains `BTC/USDso:USDso`. Every call in the PERPS.md Quick start therefore fails when copied.

## Evidence
2026-11-02T04:19:28Z (first run 2026-11-02T04:11:22Z, same result):
```
perp symbols: 1000PEPE/USDso:USDso, ADA/USDso:USDso, AVAX/USDso:USDso, BNB/USDso:USDso ...
fetchFundingRate("BTC/USDSO:USDSO") -> InvalidInputError: @somnia-chain/markets-sdk: unknown symbol BTC/USDSO:USDSO — call loadMarkets() first
fetchFundingRate("BTC/USDso:USDso") -> BTC/USDso:USDso fundingRate 0.001250141809924771
```

## Environment
- SDK @somnia-chain/markets-sdk 0.32.1
- Hideki testnet, chain id 50383, RPC https://api.hideki2.infra.testnet.somnia.network, indexer https://hideki-dev.smk.somnia.host/v1/graphql
- node v22.23.4, Linux, run on 2026-11-02 (UTC), read-only (no wallet, no transactions)
