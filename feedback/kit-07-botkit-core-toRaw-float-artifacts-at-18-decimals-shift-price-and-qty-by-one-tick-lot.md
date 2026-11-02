# dreamdex-bot-kit `packages/core` toRaw() uses Number.toFixed(decimals): at 18 decimals it returns float-artifact raw values, so alignToTick/alignToLot silently place bids one tick lower and quantities one lot smaller than requested
Severity: major
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit && npm install && npm run build -w packages/core` (or use the shipped `packages/core/dist`).
2. From a separate directory save `kq.mjs` (it imports the kit's own compiled `quant.js`; tick/lot below are a realistic 18-decimal pool: tick 0.0001 quote, lot 0.01 base):
```js
import * as q from "<kit>/packages/core/dist/quant.js";
const tick = 10n**14n, lot = 10n**16n;
for (const p of [0.172, 0.3, 0.57]) {
  const raw = q.toRaw(p, 18);
  console.log("price", p, "toRaw", raw.toString(), "| bid aligned", q.alignToTick(raw, tick, "bid").toString(), "| ask aligned", q.alignToTick(raw, tick, "ask").toString());
}
for (const n of [0.57, 0.29, 1.15]) {
  const raw = q.toRaw(n, 18);
  console.log("qty", n, "toRaw", raw.toString(), "| alignToLot", q.alignToLot(raw, lot).toString());
}
```
3. `node kq.mjs`
4. Same inputs in the kit's Python port (`packages/core-py/dreamdex_core/quant.py::to_raw`, which uses `Decimal`) give exact values (e.g. `to_raw(0.172, 18) == 172000000000000000`), so the two ports disagree.

## Expected
`toRaw(0.172, 18) == 172000000000000000n` (the comment above it says the fixed-precision string is there so float artifacts "never reach parseUnits"). A bid at exactly 0.172 stays at tick 0.172, and a quantity of 0.57 stays 0.57.

## Actual
```
price 0.172 toRaw 171999999999999986 | bid aligned 171900000000000000 | ask aligned 172000000000000000
price 0.3   toRaw 299999999999999989 | bid aligned 299900000000000000 | ask aligned 300000000000000000
price 0.57  toRaw 569999999999999951 | bid aligned 569900000000000000 | ask aligned 570000000000000000
qty 0.57 toRaw 569999999999999951 | alignToLot 560000000000000000   (expected 570000000000000000)
qty 0.29 toRaw 289999999999999980 | alignToLot 280000000000000000   (expected 290000000000000000)
qty 1.15 toRaw 1149999999999999911 | alignToLot 1140000000000000000  (expected 1150000000000000000)
```
`Number.prototype.toFixed(18)` prints the exact binary expansion of the double (0.172 -> "0.171999999999999986"), so the raw value is a few wei off the intended decimal. Rounding then goes the wrong way: bids that are exactly on a tick are rounded DOWN one whole tick, and quantities that are exactly a lot multiple lose one whole lot. Asks and a few lucky values are unaffected, so the bug is intermittent. Because `Pool.placeLimit` (`packages/core/src/pool.ts` lines 93-94) and `advanced/batch-7702` call `alignToTick(toRaw(price, quoteDecimals), ...)` / `alignToLot(toRaw(qty, baseDecimals), ...)`, every strategy built on the kit core can quote a different price/size than it computed, on 18-decimal pairs such as SOMI:USDso, with no error (the gotcha guard only checks that the result is on-grid, which it is).

## Evidence
The kit already acknowledges this exact failure in a sibling package: `packages/perp-core/src/markets.ts` `toRaw` documents that `parseUnits(x.toFixed(18), 18)` "is the obvious conversion and it is wrong: `(0.0888).toFixed(18)` is \"0.088800000000000004\", four wei off the tick grid" and uses `toFixed(Math.min(decimals, 9))` instead; `packages/core/src/quant.ts` `toRaw` still uses the unfixed form.

Output above from `node kq.mjs` run 2026-11-02 with Node 22 and viem from the kit's lockfile, against the kit's compiled `packages/core/dist/quant.js` (source: `packages/core/src/quant.ts`, `toRaw`). Suggested fix: format with a decimal-safe path (e.g. `parseUnits(String(human), decimals)` for numbers that stringify without exponent, or Decimal-style scaling as in the Python port).

## Environment
dreamdex-bot-kit main (packages/core TypeScript), Node 22, viem 2.x; no network or wallet involved (pure functions).
