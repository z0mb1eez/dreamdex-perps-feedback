# snapRawToGrid()/roundPriceToTick() treat any direction other than "up" as "down" (a typo like "UP" floors a crossing buy)
Severity: normal
Area: SDK

## Steps to reproduce
1. Setup: `mkdir repro && cd repro && npm init -y && npm pkg set type=module && npm i viem @somnia-chain/markets-sdk@0.32.1`
2. Run (`s1.mjs`):
```js
import { snapRawToGrid, roundPriceToTick } from "@somnia-chain/markets-sdk"
console.log("up   :", snapRawToGrid(15n, 10n, "up"))
console.log("UP   :", snapRawToGrid(15n, 10n, "UP"))
console.log("bogus:", snapRawToGrid(15n, 10n, "sideways"))
console.log("undef:", snapRawToGrid(15n, 10n, undefined))
console.log("price:", roundPriceToTick(15n, 10n, "Up"))
```

## Expected
The TSDoc stresses that "Rounding the wrong way is a real loss rather than a formatting choice" and that `direction` must be passed deliberately ("Pass the direction you mean"). It already throws `InvalidInputError` for a non-positive step, so an invalid `direction` (JS caller, typo, `undefined` from a missing config) should throw too.

## Actual
```
up   : 20n
UP   : 10n
bogus: 10n
undef: 10n
price: 10n
```
The implementation is `return direction === "up" ? down + step : down;`, so every value other than the exact string "up" silently rounds down. A crossing buy limit rounded down no longer sweeps the levels it was computed to reach, and a missing direction is indistinguishable from an intentional "down".

## Environment
- SDK @somnia-chain/markets-sdk 0.32.1
- node v22, Linux, 2026-11-02 (UTC), offline (no RPC needed)
