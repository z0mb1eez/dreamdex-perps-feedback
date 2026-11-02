# dreamdex-bot-kit momentum, mean-reversion (and ensemble) clear `this.position` BEFORE the exit order is sent, so a failed exit forgets a held position; the strategy then re-enters and holds an untracked inventory
Severity: major
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
import { Momentum } from "<kit>/strategies/momentum/src/strategy.ts";
import { MeanReversion } from "<kit>/strategies/mean-reversion/src/strategy.ts";
function stubPool() {
  const calls: string[] = []; let mid = 100;
  const pool: any = { minQty: 0.0001, calls, setMid: (m: number) => { mid = m; },
    topOfBook: async () => ({ bestBid: mid - 0.01, bestAsk: mid + 0.01, mid }),
    place: async (a: any) => { calls.push(a.isBid ? "BUY" : "SELL"); if (!a.isBid) throw new Error("rpc timeout"); return { txHash: "0x1", orderId: 1n, gasUsed: 0n }; } };
  return pool;
}
{ // momentum: buy fills, the stop-loss SELL throws (RPC error)
  const p = stubPool();
  const m = new Momentum(p, { symbol: "X", windowSize: 4, entryMomentum: 0.001, exitMomentum: 0, notionalUsdso: 25,
    takeProfitPct: 0.01, stopLossPct: 0.006, crossBps: 8, intervalMs: 1, dryRun: false } as any, () => {});
  for (const x of [100, 100.5, 101, 101.5, 102]) { p.setMid(x); await m.tick(); }
  console.log("momentum  after BUY            : hasPosition =", m.hasPosition(), p.calls.join(","));
  p.setMid(95); await m.tick();
  console.log("momentum  after failed stop SELL: hasPosition =", m.hasPosition(), p.calls.join(","));
  await m.flatten();
  console.log("momentum  after flatten()       : calls =", p.calls.join(","), "(shutdown flatten sends nothing)");
}
{ // mean-reversion: same shape
  const p = stubPool();
  const m: any = new MeanReversion(p, { windowSize: 40, rsiPeriod: 3, bbPeriod: 4, bbMult: 1, rsiOversold: 40, rsiExit: 99,
    notionalUsdso: 25, takeProfitPct: 0.5, stopLossPct: 0.02, crossBps: 8, intervalMs: 1, dryRun: false } as any, () => {});
  for (const x of [100, 101, 100.5, 100, 98, 95, 90]) { p.setMid(x); await m.tick(); console.log("meanrev   mid", x, "position =", !!m.position, p.calls.join(",")); }
}
```
3. Run `npx tsx repro.mts`

## Expected
If the exit order throws, the position stays tracked so the next tick (or `flatten()` on shutdown) retries the sale. At minimum it must not re-enter while an untracked position exists.

## Actual
```
momentum  after BUY            : hasPosition = true BUY
momentum  after failed stop SELL: hasPosition = false BUY,SELL
momentum  after flatten()       : calls = BUY,SELL (shutdown flatten sends nothing)
meanrev   mid 100 position = false 
meanrev   mid 101 position = false 
meanrev   mid 100.5 position = false 
meanrev   mid 100 position = false 
meanrev   mid 98 position = true BUY
meanrev   mid 95 position = false BUY,SELL
meanrev   mid 90 position = true BUY,SELL,BUY
```
After the sale fails the strategy believes it is flat (`hasPosition()` false), so `flatten()` on shutdown does nothing and the held inventory is never sold; mean-reversion even re-enters (second `BUY` after the failed `SELL`), doubling the untracked exposure. The ensemble orchestrator does the same and additionally books the realised PnL and `recordOutcome` win/loss and circuit-breaker loss before the order is attempted.

## Evidence
`strategies/momentum/src/strategy.ts` line ~124 (`this.position = undefined;` before `await this.pool.place(...)` in a try/catch that only logs), `strategies/mean-reversion/src/strategy.ts` line ~110 (the comment says it is cleared early 'so shutdown can't double-sell'), `strategies/ensemble/src/orchestrator.ts` lines ~375-396 (`recordRealizedPnl`/`recordOutcome` precede the `place`). The ensemble case was read from source and not run, because it needs a chain context; the other two are run above. The IOC no-fill case (kit-13) is a second route to the same state.

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
