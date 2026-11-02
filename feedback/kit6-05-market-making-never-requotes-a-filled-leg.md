# dreamdex-bot-kit `strategies/market-making`: a quote that is filled (or expired) is never re-posted until the mid drifts, because the bot keeps its local record as if the order were resting

Severity: normal
Area: SDK

## Steps to reproduce
1. Save `mm.mts` (real `MarketMaker`, stub pool that tracks which order ids are open on "chain"; the mid never moves):
```ts
import { MarketMaker } from "<kit>/strategies/market-making/src/strategy.ts";
import { config } from "<kit>/strategies/market-making/src/config.ts";
const cfg: any = { ...config, dryRun: false, requoteCooldownMs: 0 };
let id = 1n; const open = new Set<bigint>(); let places = 0;
const pool: any = {
  minQty: 0.01,
  topOfBook: async () => ({ bestBid: 0.9995, bestAsk: 1.0005, mid: 1.0 }),
  walletBase: async () => 0,
  place: async () => { places++; const o = id++; open.add(o); return { orderId: o, txHash: "0x1" }; },
  cancel: async (o: bigint) => { if (!open.delete(o)) throw new Error("IncorrectOrder"); },
};
const mm = new MarketMaker(pool, cfg, () => {});
await mm.onBook();
console.log("after first requote: places =", places, "open on chain =", open.size);
open.clear();                                    // both quotes get filled by takers
for (let i = 0; i < 20; i++) await mm.onBook();  // 20 more cycles, mid unchanged
console.log("after both quotes filled + 20 cycles: places =", places, "open on chain =", open.size);
```
2. `<kit>/node_modules/.bin/tsx mm.mts`

## Expected
A maker whose bid and ask were both lifted should quote again on the next cycle (the strategy's purpose is to stay on the book to earn maker volume). `yield-optimizer` already does this with `reconcileOpenOrders()` / `pool.openOrderIds()`.

## Actual
```
after first requote: places = 2 open on chain = 2
after both quotes filled + 20 cycles: places = 2 open on chain = 0
```
`requote()` returns early whenever both `this.bid` and `this.ask` are set and the mid drift is below `requoteTriggerBps`; nothing ever checks whether those orders still exist on chain (or have passed `expireMs`). A filled quote therefore leaves the bot off the book on that side (and on both, in the repro) until the mid happens to move 3 bps, which on a quiet stable pair (the README's recommended low-risk market) can be hours. The inventory skew is also frozen over the same period because it is only recomputed inside `requote()`.

## Evidence
`strategies/market-making/src/strategy.ts` `requote()` (drift early return) and `replaceLeg()`; no use of `pool.openOrderIds()` anywhere in the file.

## Environment
dreamdex-bot-kit main, Node 22, tsx; stubs only.
