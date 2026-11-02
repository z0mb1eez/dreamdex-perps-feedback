# dreamdex-bot-kit `strategies/mean-reversion`: `MR_WINDOW_SIZE` below `MR_BB_PERIOD` / `MR_RSI_PERIOD + 1` is accepted, and the bot stays in "warming up" forever and never trades

Severity: normal
Area: SDK

## Steps to reproduce
1. Save `mr.mts` (real `MeanReversion` and `config`, stub pool: quiet prices around 100, then a sharp sell-off that is oversold by any definition):
```ts
import { MeanReversion } from "<kit>/strategies/mean-reversion/src/strategy.ts";
import { config } from "<kit>/strategies/mean-reversion/src/config.ts";
const series = [...Array.from({ length: 50 }, (_, i) => 100 + (i % 2 ? 0.1 : -0.1)), 99, 98, 96, 94, 92];
async function run(windowSize: number) {
  let n = 0; const logs: string[] = [];
  const pool: any = { minQty: 0.0001, topOfBook: async () => { const m = series[Math.min(n++, series.length - 1)]!; return { bestBid: m - 0.01, bestAsk: m + 0.01, mid: m }; } };
  const bot = new MeanReversion(pool, { ...config, dryRun: true, windowSize } as any, (m: string) => logs.push(m));
  for (let i = 0; i < series.length; i++) await bot.tick();
  return logs.filter((l) => l.includes("ENTER")).length;
}
console.log("MR_WINDOW_SIZE=15 (bbPeriod=20): ENTER signals =", await run(15));
console.log("MR_WINDOW_SIZE=40 (default)    : ENTER signals =", await run(40));
```
2. `<kit>/node_modules/.bin/tsx mr.mts`

## Expected
`config.ts` states "Rolling window ... Must exceed the periods below" (`rsiPeriod` 14 -> needs 15 samples, `bbPeriod` 20 -> needs 20). A configuration that violates this should fail at startup with a message, like the other config errors in the same file do for non-numeric values.

## Actual
```
MR_WINDOW_SIZE=15 (bbPeriod=20): ENTER signals = 0
MR_WINDOW_SIZE=40 (default)    : ENTER signals = 2
```
`tick()` trims `mids` to `windowSize` before computing `bollinger(mids, bbPeriod, ...)`, which returns `undefined` for fewer than `bbPeriod` samples, so every tick takes the "warming up N/20 samples" branch for the life of the process. The status line even shows a count that can never reach the target (for example `15/20`), but the bot looks alive and polls the book every interval. Nothing is validated; `momentum` has the same unvalidated `MOM_WINDOW_SIZE` (a value of 1 makes the older half empty and the momentum is always 0).

## Evidence
`strategies/mean-reversion/src/config.ts` (comment on `windowSize`, no check) and `strategy.ts` `tick()`.

## Environment
dreamdex-bot-kit main, Node 22, tsx; stubs only.
