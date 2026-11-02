# dreamdex-bot-kit `strategies/mean-reversion` `rsi()` returns 100 ("fully overbought") for a perfectly flat price series, so a quiet book triggers the "reverted to mean" exit
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit && npm install`.
2. Save `rsi.mjs` in a separate directory:
```js
import { rsi } from "<kit>/strategies/mean-reversion/src/indicators.ts";
console.log("flat series RSI:", rsi([1,1,1,1,1,1,1,1,1,1,1,1,1,1,1], 14));
```
3. `cd <kit>/strategies/mean-reversion && npx tsx /path/to/rsi.mjs`

## Expected
With no price change in the window there is neither gain nor loss; the conventional RSI (Wilder) treats this as neutral (50) or as "no reading" (undefined, which this function already uses for a too-short series). The strategy README describes the exit as "RSI recovers to `MR_RSI_EXIT` (the mean)".

## Actual
```
flat series RSI: 100
```
`indicators.ts` returns 100 whenever `avgLoss === 0`, including `avgGain === 0`. On a quiet testnet book the mid often does not move for a full window, so an open position gets `reverted to mean (RSI 100)` and is sold at once (`strategy.ts`: `if (r >= this.cfg.rsiExit) return this.exit(...)`), and a flat window can never produce an oversold entry. Fix: return 50 (or undefined) when `avgGain === 0 && avgLoss === 0`.

## Evidence
Output above, kit's own `rsi()` under tsx, 2026-11-02.

## Environment
dreamdex-bot-kit main (strategies/mean-reversion), Node 22, tsx.
