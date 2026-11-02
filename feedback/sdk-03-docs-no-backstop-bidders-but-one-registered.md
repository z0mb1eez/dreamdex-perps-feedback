# Margin & Liquidations doc says "No backstop bidders are registered on testnet", but LiquidationEngine has 1 registered bidder
Severity: normal
Area: docs

## Steps to reproduce
1. Setup: `mkdir repro && cd repro && npm init -y && npm pkg set type=module && npm i viem @somnia-chain/markets-sdk@0.32.1`
2. Docs: https://app.testnet.dreamdex.io/docs/trading/perps-testnet/margin-and-liquidations.md, section "Liquidations": "a registered backstop bidder can take the position over ... No backstop bidders are registered on testnet, so the later stages come in sooner."
3. Run (`r2.mjs`):
```js
import { createPublicClient, http, parseAbi } from "viem"
const pc = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") })
const le = "0xA66d3C24Ad4a389d863846905D8173e1017e9F4D" // LiquidationEngine, listed in the dev docs
const abi = parseAbi(["function getBidderCount() view returns (uint256)", "function getBidders() view returns (address[])"])
console.log("UTC", new Date().toISOString())
console.log("getBidderCount", await pc.readContract({ address: le, abi, functionName: "getBidderCount" }))
console.log("getBidders", await pc.readContract({ address: le, abi, functionName: "getBidders" }))
```
(SDK equivalent ABI: `liquidationEngineReadAbi` in readsAbi.ts has the same two functions.)

## Expected
getBidderCount() == 0, per the documentation.

## Actual
getBidderCount() == 1 and getBidders() == [0xAF327764345c2f54C1F2bc3322D28E4f633793b9].

## Evidence
2026-11-02T04:18:59Z:
```
getBidderCount 1n
getBidders [ '0xAF327764345c2f54C1F2bc3322D28E4f633793b9' ]
```
Repeated 2026-11-02T04:13:34Z via the SDK ABI: same result (getBidderCount 1n, same address).

## Environment
- SDK @somnia-chain/markets-sdk 0.32.1
- Hideki testnet, chain id 50383, RPC https://api.hideki2.infra.testnet.somnia.network, indexer https://hideki-dev.smk.somnia.host/v1/graphql
- node v22.23.4, Linux, run on 2026-11-02 (UTC), read-only (no wallet, no transactions)
