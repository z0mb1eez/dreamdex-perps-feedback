# dreamdex-bot-kit `strategies/twap`: a slice whose order throws is still counted as done, so the run reports "executed 4/4 slices" and finishes having bought nothing (no retry, no remainder)
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit && npm install` (tsx is in the workspace).
2. Save `tw.mjs` in a separate directory. It drives the kit's own `Twap` class with a stub pool whose `place()` always rejects (e.g. insufficient balance, a revert, an RPC error); no network is used:
```js
import { Twap } from "<kit>/strategies/twap/src/strategy.ts";
const pool = { minQty: 0.001,
  topOfBook: async () => ({ bestBid: 0.17, bestAsk: 0.18, mid: 0.175 }),
  place: async () => { throw new Error("InsufficientBalance (stub)"); } };
const t = new Twap(pool, { side: "buy", totalUsdso: 100, slices: 4, maxSlippageBps: 50, dryRun: false }, () => {});
for (let i = 0; i < 4; i++) await t.slice();
console.log("done =", t.done, "| summary:", t.summary());
```
3. Run from the strategy directory so tsx resolves the workspace: `cd <kit>/strategies/twap && npx tsx /path/to/tw.mjs`

## Expected
A slice whose order failed is not an executed slice: it is retried or carried into the remaining schedule, and the summary reflects 0 of 4 slices executed (the README describes TWAP as building a target notional over the slices).

## Actual
```
done = true | summary: executed 4/4 slices, ~0.000000 base bought
```
In `slice()` (`strategies/twap/src/strategy.ts`) `this.slicesDone += 1` runs BEFORE `pool.place()`, and the `catch` only logs "slice failed". Every failed slice therefore advances the schedule, `done` becomes true, and the final summary claims all slices executed although nothing was bought. The same method also adds the full slice `qty` to `filledBase` after an IOC order that may fill partially or not at all.

## Evidence
Output above from running the kit's `Twap` class under tsx, 2026-11-02.

## Environment
dreamdex-bot-kit main (strategies/twap), Node 22, tsx; stub pool, no network.
