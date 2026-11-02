# PERPS.md says only BTC and ETH perps are live and its listPerpMarkets example filters on "WBTC", which returns nothing
Severity: normal
Area: docs

## Steps to reproduce
1. Setup: `mkdir repro && cd repro && npm init -y && npm pkg set type=module && npm i viem @somnia-chain/markets-sdk@0.32.1`
2. Docs in the package: `docs/PERPS.md` line 3 ("Perps are live on testnet: BTC/USDSO:USDSO and ETH/USDSO:USDSO"), lines 1207-1210 ("One-shot reads": `client.listPerpMarkets({ baseSymbol: "WBTC", limit: 20 })` then `perps[0].id`, and `getPerpState(one!.poolAddress)`). `src/markets.ts` (PerpMarket.baseSymbol doc) also uses "WBTC" as the example.
3. Run (`r5.mjs`, first part):
```js
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
const ex = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES })
console.log("UTC", new Date().toISOString())
const perps = await ex.client.listPerpMarkets()
console.log(perps.length, perps.map(p => p.baseSymbol).join(","))
console.log("WBTC:", (await ex.client.listPerpMarkets({ baseSymbol: "WBTC", limit: 20 })).length)
console.log("BTC:", (await ex.client.listPerpMarkets({ baseSymbol: "BTC" })).length)
process.exit(0)
```

## Expected
Docs describe the live market set; the documented example returns the BTC market so `perps[0].id` is usable.

## Actual
21 perp markets are live (the app docs page "Perps on Testnet" says "All 21 markets"; the developer page lists 21 base-decimal entries), not 2. The base symbol is `BTC`, not `WBTC`: the documented filter returns an empty array, so `perps[0].id` throws `TypeError: Cannot read properties of undefined` when the snippet is run as written. (The filter is also case-sensitive: `baseSymbol: "btc"` returns 0 rows and `quoteSymbol: "USDSO"` returns 0, while `"USDso"` returns 21.)

## Evidence
2026-11-02T04:19:28Z (first run 2026-11-02T04:11:21Z):
```
listPerpMarkets() length: 21 baseSymbols: ZRO,LIT,VVV,1000PEPE,PUMP,ZEC,TAO,WLD,NEAR,XLM,AVAX,LINK,SUI,ADA,BNB,DOGE,XRP,HYPE,SOL,ETH,BTC
listPerpMarkets({baseSymbol:"WBTC",limit:20}).length = 0
listPerpMarkets({baseSymbol:"BTC"}).length = 1
```
Other markets have base decimals 6/7/8/9/18/24 (BTC has 8), which the PERPS.md intro does not mention either; the developer page table is correct.

## Environment
- SDK @somnia-chain/markets-sdk 0.32.1
- Hideki testnet, chain id 50383, RPC https://api.hideki2.infra.testnet.somnia.network, indexer https://hideki-dev.smk.somnia.host/v1/graphql
- node v22.23.4, Linux, run on 2026-11-02 (UTC), read-only (no wallet, no transactions)
