# portfolioKey() ignores positionsLimit/positionsOffset, so paged getPortfolio reads share one cache key
Severity: normal
Area: SDK

## Steps to reproduce
1. Setup: `mkdir repro && cd repro && npm init -y && npm pkg set type=module && npm i viem @somnia-chain/markets-sdk@0.32.1`
2. Run (`k1.mjs`):
```js
import { portfolioKey } from "@somnia-chain/markets-sdk"
const A = "0xAbC0000000000000000000000000000000000001"
const page1 = portfolioKey(A, { positionsLimit: 10, positionsOffset: 0 })
const page2 = portfolioKey(A, { positionsLimit: 10, positionsOffset: 10 })
const big   = portfolioKey(A, { positionsLimit: 1000 })
const dflt  = portfolioKey(A, {})
console.log(JSON.stringify([page1, page2, big, dflt]))
console.log("page1==page2", JSON.stringify(page1) === JSON.stringify(page2))
console.log("big==default", JSON.stringify(big) === JSON.stringify(dflt))
```

## Expected
The header of `queryKeys.ts` states the invariant "an input that changes the read's result changes the key". `PortfolioOptions` (binary/portfolio.ts) has `positionsLimit` and `positionsOffset`, and BINARY.md says "`getPortfolio` accepts `positionsLimit` and `positionsOffset` for the same indexed position pages" (follow `positionsNextOffset`). Different pages must get different keys.

## Actual
```
[["somnia-markets","portfolio","0xabc0000000000000000000000000000000000001",{}],["somnia-markets","portfolio","0xabc0000000000000000000000000000000000001",{}],["somnia-markets","portfolio","0xabc0000000000000000000000000000000000001",{}],["somnia-markets","portfolio","0xabc0000000000000000000000000000000000001",{}]]
page1==page2 true
big==default true
```
`portfolioKey` only passes `ordersLimit`, `tradesLimit` and `since` to `pruned()`. A TanStack Query / SWR consumer using `portfolioKey(account, opts)` (the documented pattern in how-to/use-the-react-hooks.md) gets page 1's cached positions back for page 2 (and a `positionsLimit: 1000` read is served from the default 200-position entry), so wallets with more than 200 positions silently show a truncated/duplicated list. `invalidateQueries({queryKey: portfolioKey(account)})` still works, but the collision breaks pagination.

## Environment
- SDK @somnia-chain/markets-sdk 0.32.1
- node v22, Linux, 2026-11-02 (UTC), offline (no RPC needed)
