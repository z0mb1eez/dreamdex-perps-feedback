# dreamdex-bot-kit edge-analytics: `midAt()` picks the nearest tick even if it is AFTER the target time, so the fill-time mid (and "captured spread") uses future prices
Severity: normal
Area: SDK

## Steps to reproduce
1. In `dreamdex-bot-kit/tools/edge-analytics` (deps from the repo root `npm install`), save `t.ts`:
```ts
import { midAt } from "./src/markout.ts";
// fill at t=100; mid was 1 at t=90 (known at fill time), 2 at t=101 (the future)
console.log(midAt([{tsMs:90,mid:1},{tsMs:101,mid:2}], 100, 50));
```
2. `npx tsx t.ts`

## Expected
The mid known at fill time (1), i.e. the last tick with `ts <= target`. The doc comment says "Nearest mid at or bracketing `targetMs`" but `markoutFill` uses it as `mid0`, the price at the moment of the fill, and the module header defines capturedSpread = sign*(mid₀−p).

## Actual
Prints `2`. After the binary search finds the last tick `<= target`, the code switches to the next tick if it is closer in time (`Math.abs(after.tsMs - targetMs) < Math.abs(before.tsMs - targetMs)`), i.e. it returns a price from after the fill. With sparse polling (the README suggests a book poller) `mid0` is regularly a post-fill price, so captured spread and adverse move are biased (look-ahead): a move that happens right after the fill gets booked into "captured spread" instead of "adverse selection", understating adverse selection in exactly the cases the tool exists to detect.

## Evidence
Output of the script above: `2`. Code: `src/markout.ts` `midAt`, lines after "Pick whichever neighbour is closer in time."

## Environment
dreamdex-bot-kit v0.1.0 (main, 2026-11-02), Node 22, tsx.
