# dreamdex-bot-kit edge-analytics: `parseTs()` throws on fractional epoch timestamps ("1700000000.5") and aborts the whole load
Severity: normal
Area: SDK

## Steps to reproduce
1. In `dreamdex-bot-kit/tools/edge-analytics`, save `t.ts`:
```ts
import { parseTs } from "./src/csv.ts";
for (const s of ["1700000000","1700000000123","1700000000.5","1700000000123.0"]) {
  try { console.log(s, parseTs(s)); } catch (e: any) { console.log(s, "THROWS", e.message); }
}
```
2. `npx tsx t.ts`

## Expected
The docstring says it parses "seconds, milliseconds, or ISO-8601". Fractional seconds (`time.time()` in Python, `Date.now()/1000` in JS) are the usual way bots/pollers log second-precision epochs; they should parse (→ 1700000000500).

## Actual
```
1700000000 1700000000000
1700000000123 1700000000123
1700000000.5 THROWS unparseable timestamp: 1700000000.5
1700000000123.0 THROWS unparseable timestamp: 1700000000123.0
```
The regex `/^\d+$/` rejects the decimal point, falls through to `Date.parse`, gets NaN and throws. `loadMidCsv`/`loadTradesCsv` call it unguarded inside `.map`, so one such row aborts the whole file instead of being skipped (their later `Number.isFinite` filter is never reached).

## Evidence
Output above.

## Environment
dreamdex-bot-kit v0.1.0 (main, 2026-11-02), Node 22, tsx.
