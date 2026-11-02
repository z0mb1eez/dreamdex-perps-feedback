# scripts/order-history.ts: default UNTIL is start of today UTC, so a FROM later today yields an inverted window and "0 orders, 0 fills" with no warning
Severity: normal
Area: docs

## Steps to reproduce
1. Clone dreamdex-bot-kit, `npm install`. From a separate directory run (read-only, no key):
```
NETWORK=testnet SYMBOL=SOMI:USDso FROM=$(( $(date +%s) - 600 )) OUT=/tmp/oh.json npx tsx <kit>/scripts/order-history.ts
```
2. Repeat with an explicit end:
```
NETWORK=testnet SYMBOL=SOMI:USDso FROM=$(( $(date +%s) - 600 )) UNTIL=$(date +%s) OUT=/tmp/oh2.json npx tsx <kit>/scripts/order-history.ts
```

## Expected
The script header documents `FROM=...` as a way to choose the window and the README lists `FROM=2026-10-02 npx tsx scripts/order-history.ts`. Giving only a recent `FROM` (for example "the last 10 minutes") should return that window or fail with a clear "FROM is after UNTIL" error.

## Actual
`UNTIL` defaults to `todayStart` (00:00 UTC today, lines 80-83: `const UNTIL = parseTime(process.env.UNTIL, todayStart)`), not to now. With a FROM after today's midnight the window is inverted, the query matches nothing, and the script prints `0 orders, 0 fills` and exits successfully, which looks like "the market had no activity". The same window with explicit `UNTIL` returns 728 orders and 59 fills. The only hint is the printed window line (`FROM .. UNTIL` with UNTIL earlier than FROM).

## Evidence
2026-11-02 ~09:15 UTC:
```
window: 2026-11-02T09:05:31.000Z .. 2026-11-02T00:00:00.000Z  network: testnet  source: indexer (GraphQL)
  SOMI:USDso: 0 orders, 0 fills
wrote /tmp/dd/run/oh.json (0 orders, 0 fills)
--- with UNTIL=now ---
window: 2026-11-02T09:05:41.000Z .. 2026-11-02T09:15:41.000Z  network: testnet  source: indexer (GraphQL)
  SOMI:USDso: 728 orders, 59 fills
```

## Environment
- dreamdex-bot-kit 0.1.0 (scripts/order-history.ts), node v22.23.4, tsx from the kit's node_modules, Linux; Shannon indexer https://dev.smk.somnia.host/v1/graphql
