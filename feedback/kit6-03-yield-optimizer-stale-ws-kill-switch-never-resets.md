# dreamdex-bot-kit `strategies/yield-optimizer`: every kill switch is permanent, so a single 15 s WebSocket gap stops quoting for the rest of the process even after the feed recovers

Severity: major
Area: SDK

## Steps to reproduce
1. In a clone of the kit with dependencies installed save `yo.mts` (real `YieldOptimizer` and `config`, stubbed pool / chain context; nothing sent):
```ts
import { YieldOptimizer } from "<kit>/strategies/yield-optimizer/src/strategy.ts";
import { config } from "<kit>/strategies/yield-optimizer/src/config.ts";
const cfg: any = { ...config, dryRun: false, requoteCooldownMs: 0, tradesCsv: undefined, midsCsv: undefined, yieldCsv: undefined };
let mid = 1.0, nextId = 1n; const posted: string[] = [];
const pool: any = {
  symbol: "SOMI:USDso", quoteDecimals: 18, tick: 0.0001, minQty: 0.01, params: { tickSize: 10n ** 14n },
  topOfBook: async () => ({ bestBid: mid - 0.0005, bestAsk: mid + 0.0005, mid }),
  walletBase: async () => 1, openOrderIds: async () => [],
  cancel: async () => {}, place: async (o: any) => { posted.push(o.isBid ? "bid" : "ask"); return { orderId: nextId++, txHash: "0x1" }; },
};
const ctx: any = { net: { name: "stub" }, account: { address: "0x1" }, publicClient: { getBalance: async () => 10n ** 18n } };
let lastWs = Date.now();
const bot = new YieldOptimizer(ctx, pool, cfg, () => {}, { lastWsAt: () => lastWs });
await bot.onBook(); console.log("healthy: posted", posted.join(","), "killed", bot.extras().killed);
lastWs = Date.now() - 60_000; await bot.onBook();            // 60 s feed hiccup
console.log("after stale ws: killed", bot.extras().killed, bot.extras().killReason);
lastWs = Date.now(); posted.length = 0;                        // feed recovers
for (let i = 0; i < 3; i++) { mid += 0.01; await bot.onBook(); }
console.log("feed recovered, 3 more cycles: posted", posted.length, "orders; killed", bot.extras().killed);
```
2. `<kit>/node_modules/.bin/tsx yo.mts`

## Expected
`YO_STALE_MS` is described as a stale-feed switch (index.ts: "kill switch on stale feed / gas / toxicity"). A stale feed is a transient condition; once messages flow again the optimizer should resume quoting (or the docs should say a restart is required).

## Actual
```
healthy: posted bid,ask killed false
after stale ws: killed true ws stale > 15000ms
feed recovered, 3 more cycles: posted 0 orders; killed true
```
`tripKill()` sets `this.killed = true` and nothing ever clears it (`grep killed strategy.ts`: set at the declaration, in `tripKill`, and read in `onBook`). `onBook` then returns on every call through the `|| this.killed` branch, so the bot keeps running, logging nothing new, and quotes nothing. The same applies to the gas switch (a top-up never resumes), `placeFailures >= 5` (the counter is only reset by a successful place, which can no longer happen) and the inventory switch (the optimizer cannot sell the excess down because it has cancelled its asks, and `flattenAboveUsdso` is 0 by default).

## Evidence
`strategies/yield-optimizer/src/strategy.ts`: `onBook()` (`mode === "cancel" || mode === "flatten" || this.killed`), `tripKill()`. A reconnecting `DreamDexWs` (the intended recovery path) therefore leaves a live process that has silently stopped earning yield score.

## Environment
dreamdex-bot-kit main, Node 22, tsx; stubs only.
