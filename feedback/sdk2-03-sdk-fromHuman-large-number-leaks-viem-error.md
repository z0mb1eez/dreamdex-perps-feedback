# fromHuman(number >= 1e21) throws viem InvalidDecimalNumberError, and ties round differently than documented
Severity: normal
Area: SDK

## Steps to reproduce
1. Setup: `mkdir repro && cd repro && npm init -y && npm pkg set type=module && npm i viem @somnia-chain/markets-sdk@0.32.1`
2. Run (`u1.mjs`):
```js
import * as S from "@somnia-chain/markets-sdk"
const t = (n, f) => { try { console.log(n, "=>", f()) } catch (e) { console.log(n, "THROWS", e.constructor.name, e.message.split("\n")[0]) } }
t("fromHuman(1e21,6)", () => S.fromHuman(1e21, 6))
t("fromHuman(1e21,18)", () => S.fromHuman(1e21, 18))
t("fromHuman(1.005,2)", () => S.fromHuman(1.005, 2))
t("fromHuman(0.285,2)", () => S.fromHuman(0.285, 2))
t("fromHuman(1e-7,6)", () => S.fromHuman(1e-7, 6))
t("fromHuman(Infinity,6)", () => S.fromHuman(Infinity, 6))
```

## Expected
`fromHuman` guards `Infinity`/`NaN` explicitly so that "a third-party error [does not cross] our boundary" (units.ts comment), i.e. invalid numbers raise `InvalidInputError`. Its doc also says over-precise numbers are rounded "half-away-from-zero".

## Actual
```
fromHuman(1e21,6) THROWS InvalidDecimalNumberError Value `1e+21` is not a valid decimal number.
fromHuman(1e21,18) THROWS InvalidDecimalNumberError Value `1e+21` is not a valid decimal number.
fromHuman(1.005,2) => 100n
fromHuman(0.285,2) => 28n
fromHuman(1e-7,6) => 0n
fromHuman(Infinity,6) -> InvalidInputError (as designed)
```
- `humanToDecimalString` falls back to `n.toFixed(decimals)`, which itself returns exponent notation for |n| >= 1e21; `parseUnits` then throws viem's `InvalidDecimalNumberError`, the exact third-party leak the Infinity guard was added to avoid. Should be `InvalidInputError`.
- `toFixed` rounds the binary expansion, so decimal ties are not rounded half-away-from-zero as documented (1.005 at 2dp gives 1.00, 0.285 gives 0.28). Pass a string to get exact behaviour; the docstring should say "nearest double" rather than half-away.
- Values below half a unit (1e-7 at 6dp) silently become `0n`, which then reaches order paths as a zero amount.

## Environment
- SDK @somnia-chain/markets-sdk 0.32.1
- node v22, Linux, 2026-11-02 (UTC), offline (no RPC needed)
