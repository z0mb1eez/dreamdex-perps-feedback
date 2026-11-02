# dreamdex-bot-kit `strategies/yield-optimizer`: `YO_MAX_TOXIC_BPS` ("kill on rolling adverse mark-out") can never trigger, nothing records a real mark-out

Severity: normal
Area: docs

## Steps to reproduce
1. Save `yo2.mts` (real `YieldOptimizer`, stub pool; every resting bid is "filled" each cycle while the mid falls 1 % per cycle, 40 cycles):
```ts
import { YieldOptimizer } from "<kit>/strategies/yield-optimizer/src/strategy.ts";
import { config } from "<kit>/strategies/yield-optimizer/src/config.ts";
const cfg: any = { ...config, dryRun: false, requoteCooldownMs: 0, maxToxicBps: 30, maxInventoryUsdso: 1e9, tradesCsv: undefined, midsCsv: undefined, yieldCsv: undefined };
let mid = 1.0, nextId = 1n, open: bigint[] = [];
const pool: any = {
  symbol: "S", quoteDecimals: 18, tick: 0.0001, minQty: 0.01, params: { tickSize: 10n ** 14n },
  topOfBook: async () => ({ bestBid: mid - 0.0005, bestAsk: mid + 0.0005, mid }),
  walletBase: async () => 1, openOrderIds: async () => open,
  cancel: async () => {}, place: async () => { const id = nextId++; open.push(id); return { orderId: id, txHash: "0x1" }; },
};
const ctx: any = { net: { name: "stub" }, account: { address: "0x1" }, publicClient: { getBalance: async () => 10n ** 18n } };
const bot = new YieldOptimizer(ctx, pool, cfg, () => {}, { lastWsAt: () => Date.now() });
for (let i = 0; i < 40; i++) { mid *= 0.99; await bot.onBook(); open = []; }
console.log("mid fell to", mid.toFixed(3), "(-33%) with every bid filled; killed =", bot.extras().killed);
```
2. `<kit>/node_modules/.bin/tsx yo2.mts`; then `grep -n pushMarkout <kit>/strategies/yield-optimizer/src/*.ts`.

## Expected
README: "`YO_MAX_TOXIC_BPS` | Kill on rolling adverse mark-out". Buying into a falling market is the textbook adverse-selection case; the average mark-out is deeply negative and the switch should trip.

## Actual
```
mid fell to 0.669 (-33%) with every bid filled; killed = false
strategy.ts:418:      this.pushMarkout(0);
strategy.ts:632:  private pushMarkout(bps: number): void {
```
`recentMarkouts` is only ever fed by `pushMarkout(0)` from `flattenExcess` (a constant zero), so the average used by `checkKillSwitches` is 0 and `avg < -maxToxicBps` is unreachable. The optimizer does not observe fills at all (it only drops local legs in `reconcileOpenOrders`), so there is no mark-out to compute. The README, `config.ts` ("Rolling mark-out kill threshold") and `index.ts` header all advertise a protection that does not exist.

## Evidence
`strategies/yield-optimizer/src/strategy.ts` (`checkKillSwitches`, `flattenExcess`, `pushMarkout`), `strategies/yield-optimizer/README.md` line "YO_MAX_TOXIC_BPS".

## Environment
dreamdex-bot-kit main, Node 22, tsx; stubs only.
