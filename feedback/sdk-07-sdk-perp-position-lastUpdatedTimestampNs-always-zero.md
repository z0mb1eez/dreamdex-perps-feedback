# PerpPosition.lastUpdatedTimestampNs is always 0 on chain, so getPerpPosition and exchange.fetchPositions report no update time
Severity: normal
Area: SDK

## Steps to reproduce
1. Setup: `mkdir repro && cd repro && npm init -y && npm pkg set type=module && npm i viem @somnia-chain/markets-sdk@0.32.1`
2. Run (`r3.mjs`):
```js
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
const c = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES }).client
const btc = "0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0", marginBank = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394"
console.log("UTC", new Date().toISOString())
const { holders } = await c.getPerpSideHolders({ marginBank, pool: btc, isLong: true }, {})
for (const account of holders.slice(0, 5)) {
  const p = await c.getPerpPosition({ marginBank, account, pool: btc })
  const ix = await c.listPerpPositions(account, { pool: btc })
  console.log(account, "size", p.size, "lastUpdatedTimestampNs", p.lastUpdatedTimestampNs, "| indexer updatedAt", ix[0]?.updatedAt)
}
process.exit(0)
```
3. Raw check without the SDK: `MarginBank(0x478769E1177C0773c43A593DCCc4Ad15F15F1394).getPosition(account, pool)` (ABI in readsAbi.ts: `(int128 size, uint128 avgEntryPrice, int256 entryFundingIndex, uint64 lastUpdatedTimestampNs)`).

## Expected
`PerpPosition.lastUpdatedTimestampNs` ("Last position update (nanoseconds)", perp/state.ts) is the time of the last change, i.e. roughly the indexer's `updatedAt` x 1e9.

## Actual
It is `0n` for every open position checked (7781 BTC long holders were returned; dozens were scanned across two runs, plus the 5 below; none was non-zero), both through the SDK and a raw `eth_call` on MarginBank. Consequence in the SDK: `exchange.fetchPositions()` computes `tsMs = Number(pos.lastUpdatedTimestampNs / 1_000_000n)` (unified/exchange.ts ~5816), so the unified position timestamp is 0 (1970-01-01) for every position. The indexer has the real time (`updatedAt`), so the SDK could fall back to it, or the field/docs should say the contract does not populate it.

## Evidence
2026-11-02T04:19:19Z (first run 2026-11-02T04:14:06Z, identical zeros):
```
0xd167376D0431131b4C2EC25e3581c6AF734794F3 size 26000n lastUpdatedTimestampNs 0n | indexer updatedAt 1790866330
0xbc28A1b06eaF0513CD0B04D7345Ac605ec8b4bA3 size 5627000n lastUpdatedTimestampNs 0n | indexer updatedAt 1791385657
0xb6E8369a7270C8C12c912Bb50fae0550D0fF5b64 size 19000n lastUpdatedTimestampNs 0n | indexer updatedAt 1791305904
0xF237c86cd454D7F7D6bFb2f826a986bE0aB577B3 size 19000n lastUpdatedTimestampNs 0n | indexer updatedAt 1791305921
0x5c693d3D7DaCFd71F6F70A0cB6010A773e004d68 size 1148000n lastUpdatedTimestampNs 0n | indexer updatedAt 1791462863
```
Also seen for a position updated moments earlier (0x47537e3a3ea6e9391f3b26ea45618db6828c8bff, indexer updatedAt 1793592980, chain lastUpdatedTimestampNs 0n, 2026-11-02T04:16:39Z).

## Environment
- SDK @somnia-chain/markets-sdk 0.32.1
- Hideki testnet, chain id 50383, RPC https://api.hideki2.infra.testnet.somnia.network, indexer https://hideki-dev.smk.somnia.host/v1/graphql
- node v22.23.4, Linux, run on 2026-11-02 (UTC), read-only (no wallet, no transactions)
