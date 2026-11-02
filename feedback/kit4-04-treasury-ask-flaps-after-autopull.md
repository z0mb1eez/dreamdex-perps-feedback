# dreamdex-bot-kit `strategies/treasury` counts the resting bid's reserved quote as idle but not the resting ask's locked base, so after the first requote the ask is cancelled, then re-posted, and flaps every cycle
Severity: normal
Area: SDK

## Steps to reproduce
1. Save `d.mts` (imports the kit's `TreasuryBot`; the pool is a stub that models the auto-pull behaviour the kit itself documents in `Pool.walletBase()` and `readQuoteIdle()`: a resting ask moves its base out of the wallet, a cancel returns it):
```ts
import { TreasuryBot } from "<kit>/strategies/treasury/src/strategy.ts";
let wallet = 100, mid = 1.0, nextId = 1n;
const open = new Map<bigint, { isBid: boolean; qty: number }>();
const pool: any = {
  minQty: 0.01,
  topOfBook: async () => ({ bestBid: mid - 0.0005, bestAsk: mid + 0.0005, mid }),
  walletBase: async () => wallet,
  openOrderIds: async () => [...open.keys()],
  place: async (a: any) => { const id = nextId++; open.set(id, a); if (!a.isBid) wallet -= a.qty; return { orderId: id, txHash: "0x1" }; },
  cancel: async (id: bigint) => { const o = open.get(id)!; open.delete(id); if (!o.isBid) wallet += o.qty; return "0x2"; },
};
const cfg: any = { dryRun: false, deployRatio: 1, minIdleUsdso: 0, spreadBps: 12, requoteTriggerBps: 5, inventorySkewBps: 0, maxBookSpreadBps: 50, requoteCooldownMs: 0, expireMs: 1000 };
const bot = new TreasuryBot({} as any, pool, cfg, () => {}, async () => 1000);   // 1000 USDso quote, 100 base
for (let i = 0; i < 6; i++) {
  mid *= 1.001;                                   // 10 bps drift -> triggers a requote
  await bot.onBook();
  const ask = [...open.values()].find((o) => !o.isBid);
  console.log(`cycle ${i}: wallet base=${wallet.toFixed(2)} resting ask qty=${ask?.qty.toFixed(4)}`);
}
```
2. `<kit>/node_modules/.bin/tsx d.mts`

## Expected
A steady two-sided quote while the inventory is unchanged. The bid side handles this: `readQuoteIdle()` adds back `bid.price * bid.qty` because "auto-pull removes that from the wallet while the order lives". The ask should be sized from base held plus base already locked in the resting ask.

## Actual
```
cycle 0: wallet base=0.00 resting ask qty=100.0000
cycle 1: wallet base=100.00 resting ask qty=undefined
cycle 2: wallet base=0.00 resting ask qty=100.0000
cycle 3: wallet base=100.00 resting ask qty=undefined
cycle 4: wallet base=0.00 resting ask qty=100.0000
cycle 5: wallet base=100.00 resting ask qty=undefined
```
`requote()` computes `askQty = Math.min(baseInv, deployable / mid)` with `baseInv = await this.pool.walletBase()`. While the ask is resting its base is no longer in the wallet, so `baseInv` reads 0, `askQty < minQty`, and the code takes the "ask qty ... < min — bid-only" branch and cancels the ask. Next requote the base is back and the ask is posted again. The venue sees the ask on the book only every other requote (losing queue priority and spending a cancel/post tx pair per cycle), and the inventory-skew term (`invUsdso = baseInv * mid`) is wrong in the same way.

## Evidence
`strategies/treasury/src/strategy.ts` `requote()` (`const baseInv = await this.pool.walletBase();`) versus `readQuoteIdle()` which compensates only for the bid. The backtest's `SimPool.walletBase()` returns the ledger balance without any locking, so the backtest cannot show this behaviour.

## Environment
dreamdex-bot-kit main, Node 22, tsx; stub pool, no network.
