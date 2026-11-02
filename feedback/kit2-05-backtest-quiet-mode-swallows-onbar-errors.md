# dreamdex-bot-kit backtest `quiet: true` silently swallows every `onBar` exception: a bot that throws on every bar returns a normal-looking result with no warning
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
import { backtest } from "<kit>/packages/backtest/src/index.ts";
const candles: any[] = Array.from({ length: 30 }, (_, i) =>
  ({ timestamp: 1700000000000 + i * 3600000, open: "100", high: "101", low: "99", close: "100", volume: "10" }));
const r = await backtest({
  label: "broken", symbol: "SOMI:USDso", interval: "1h" as any, network: "testnet" as any,
  since: candles[0].timestamp, until: candles[29].timestamp, candles, quiet: true,
  createBot: async () => ({ onBar: async () => { throw new Error("boom: bot is broken"); } }) as any,
});
console.log("warnings:", JSON.stringify(r.warnings));
console.log("trades:", r.metrics.trades, "totalPnl:", r.metrics.totalPnl);
process.exit(0);
```
3. Run `npx tsx repro.mts`

## Expected
Errors thrown by the bot are surfaced in `result.warnings` (or counted) even when console logging is off, because `quiet` is meant to silence output, not hide failures. Parameter sweeps and `reviewBots` use `quiet`.

## Actual
```
warnings: []
trades: 0 totalPnl: 0
```
`warnings` is empty and the result is a clean 0-trade, 0-PnL run - indistinguishable from a strategy that legitimately had no signal.

## Evidence
`packages/backtest/src/replay/runner.ts` ~line 113: `log` is a no-op when `opts.quiet`, and line ~219 `log("onBar error", ...)` / `finish error` are the only places those exceptions go. They are not pushed to `warnings`. Same for `finish()` failures.

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
