# perpPositionAnalytics.unrealizedPnl truncates toward zero but MarginBank floors it, so "re-sums to equity exactly" is off by 1 wei per losing position
Severity: normal (wei-level, but the docs claim exactness)
Area: SDK

## Steps to reproduce
1. Setup: `mkdir repro && cd repro && npm init -y && npm pkg set type=module && npm i viem @somnia-chain/markets-sdk@0.32.1`
2. Run (`an1.mjs`; read-only):
```js
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
import { createPublicClient, http, parseAbi } from "viem"
const c = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: "https://hideki-dev.smk.somnia.host/v1/graphql", addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES }).client
const pc = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") })
const btc = "0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0", mb = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394"
const bank = parseAbi(["function getAccountState(address) view returns ((int256 unlocked,uint256 locked,address[] pools))","function getAccountHealth(address) view returns (int256 equity,uint256 imReq,uint256 mmReq,uint256 cmReq)"])
let n = 0, bad = 0
for (const isLong of [true, false]) {
  const { holders } = await c.getPerpSideHolders({ marginBank: mb, pool: btc, isLong }, {})
  for (const a of holders.slice(0, 20)) {
    const rows = (await c.listPerpPositionAnalytics({ marginBank: mb, account: a })).filter(r => r.priceable)
    if (!rows.length) continue
    const bn = rows[0].asOfBlock // same block the SDK used
    const st = await pc.readContract({ address: mb, abi: bank, functionName: "getAccountState", args: [a], blockNumber: bn })
    const h = await pc.readContract({ address: mb, abi: bank, functionName: "getAccountHealth", args: [a], blockNumber: bn })
    const eq = st.unlocked + st.locked + rows.reduce((s, r) => s + r.equityContribution, 0n)
    n++; if (eq !== h[0]) { bad++; console.log("MISMATCH", a, eq - h[0]) }
  }
}
console.log({ n, bad }); process.exit(0)
```
3. Single-position detail (account 0x27871F6eCBCc6eb3B5aE6C4cE6541dbA120aFFb9, block 39580458): `getPosition` size 3342000, avgEntryPrice 83730399820466786355475, mark 78066318772871857500000, oneBase 1e8. `(mark - entry) * size` = -18929358861062252234997450000, divided by oneBase = -189293588610622522349.9745. SDK returns `unrealizedPnl: -189293588610622522349n` (truncated); the chain's equity implies -...350 (floored).

## Expected
Per the `perpPositionAnalytics` doc (margin.ts): "Across every active market these add to `equity - collateral`, exactly", and `unrealizedPnl` "Truncates toward zero, matching `PerpMath.unrealizedPnl`'s plain int256 division".

## Actual
```
{ n: 40, bad: 13 }
```
In all 13 mismatches SDK equity is exactly 1 wei HIGHER than `MarginBank.getAccountHealth().equity` (e.g. 3439038682066842679170 vs ...169). Only accounts with a losing position and a non-zero division remainder are affected; imReq/mmReq/cmReq matched exactly in all 40. Recomputing with floor division for `unrealizedPnl` (toward -infinity) instead of truncation reproduces the chain equity in 40/40 accounts. So the contract floors the PnL (or equivalently rounds the loss up); the SDK's comment and docstring about truncation are wrong, and the SDK slightly overstates equity (by up to 1 wei per losing position) in the unsafe direction. Fix: use floor division in `perpPositionAnalytics` (margin.ts, `unrealizedPnl`) and correct the doc; `returnOnMarginBps` is affected only negligibly.

## Environment
- SDK @somnia-chain/markets-sdk 0.32.1
- Hideki testnet, chain id 50383, RPC https://api.hideki2.infra.testnet.somnia.network
- node v22, Linux, 2026-11-02 (UTC), read-only
