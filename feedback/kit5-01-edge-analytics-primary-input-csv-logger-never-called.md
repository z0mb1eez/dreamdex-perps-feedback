# dreamdex-bot-kit: edge-analytics' "primary input" (the kit's csv-logger) is never written by any bot — `logTrade()` has zero call sites
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit`
2. Read `tools/edge-analytics/README.md` ("The primary input is the kit's own `csv-logger` output") and `docs/measuring-edge.md` line 122 ("Log trades with the kit's `csv-logger` (`post`/`cancel`/`fill` rows…)").
3. Find the logger: `examples/02-modular-typescript/src/utils/csv-logger.ts` exports `logTrade()`.
4. Search for callers:
```
grep -rn "logTrade\|csvTradeLog" --include=*.ts --include=*.mjs . | grep -v node_modules
```

## Expected
Running the kit's example bot (or any strategy) with `CSV_TRADE_LOG` set produces `data/trades.csv` containing `post`/`cancel`/`fill` rows that `npm start -- --trades data/trades.csv` in `tools/edge-analytics` can analyse, as the README and `measuring-edge.md` describe.

## Actual
The grep returns only the definition (`csv-logger.ts:61`) and the `csvTradeLog` config constant (`constants.ts:72`). `logTrade` is never imported or called anywhere in the repo, so no kit bot ever writes `data/trades.csv`. Users who follow the docs get no file (or an empty one) and "No fills found". In addition the `TradeRow.action` union is `"post"|"cancel"|"fill"|"expire"|"error"` — it has no `"reduce"`, yet the edge-analytics README table lists `post/cancel/reduce/fill` and the tool counts `reduce` for its transactions-per-fill metric, so reduce txs could not be logged even if the logger were wired.

## Evidence
Repo state of `main` fetched 2026-11-02; grep output above shows the single definition and no usages.

## Environment
dreamdex-bot-kit v0.1.0 (main, 2026-11-02), Node 22.
