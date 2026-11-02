# dreamdex-bot-kit backtest candle cache is keyed on `untilMs`, which defaults to `Date.now()`, so the cache never hits for the default (no `--until`) run and the cache directory grows by one file per run
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
import { readCandleCache, writeCandleCache } from "<kit>/packages/backtest/src/candles/cache.ts";
import { readdirSync } from "node:fs";
const dir = "./cache-demo";
const candles: any[] = [{ timestamp: 1 }];
// what runner.ts does when opts.until is undefined: until = Date.now()
writeCandleCache("SOMI:USDso", "1h", 0, Date.now(), "testnet", candles, { dir });
await new Promise((r) => setTimeout(r, 5));
const hit = readCandleCache("SOMI:USDso", "1h", 0, Date.now(), "testnet", { dir });   // the next run, 5 ms later
console.log("second run cache hit:", hit !== null);
writeCandleCache("SOMI:USDso", "1h", 0, Date.now(), "testnet", candles, { dir });
console.log("files in cache dir:", readdirSync(dir).length);
```
3. Run `npx tsx repro.mts`

## Expected
A repeat run of the same symbol/interval/since window re-uses the cached candles (the whole point of `readCandleCache`), or `until` is rounded to the interval boundary before keying.

## Actual
```
second run cache hit: false
files in cache dir: 2
```
Every run is a miss and writes a new file, so the default workflow re-downloads the full history each time.

## Evidence
`packages/backtest/src/replay/runner.ts` lines ~111 and ~285: `const until = opts.until ?? Date.now();` is passed straight into `readCandleCache`/`writeCandleCache`, and `cache.ts::cacheKey` hashes `untilMs` exactly (millisecond resolution). No eviction exists either.

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
