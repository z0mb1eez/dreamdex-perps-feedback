# dreamdex-bot-kit `strategies/perp-starter`: when it adopts an existing position it arms the take-profit / stop-loss for `PERP_SIDE`, not for the position's real side, so a short is bracketed backwards

Severity: major
Area: SDK

## Steps to reproduce
1. In an empty dir `k/` save the hook files below (they replace `@dreamdex-bot-kit/perp-core` with a stub so the real `strategies/perp-starter/src/index.ts` runs unchanged; DRY_RUN default, nothing is sent):

`k/hook.mjs`
```js
import { register } from "node:module";
register("./resolve.mjs", import.meta.url);
```
`k/resolve.mjs`
```js
export async function resolve(spec, ctx, next) {
  if (spec === "@dreamdex-bot-kit/perp-core") return { url: new URL("./perpstub.mjs", import.meta.url).href, shortCircuit: true };
  return next(spec, ctx);
}
```
`k/perpstub.mjs`
```js
const market = { symbol: "BTC/USDso:USDso", display: "BTC-PERP", info: { baseSymbol: "BTC", markPrice: String(60000n * 10n ** 18n) } };
export const ORDER_TYPE = { MARKET: 1 };
export const loadEnv = () => {}; export const envNum = (n, f) => f; export const onStop = () => () => false;
export const createExchange = () => ({ config: { dryRun: true, symbol: "BTC-PERP", owner: undefined }, exchange: { walletAddress: "0x1", fetchOrderBook: async () => ({ asks: [[60000, 1]], bids: [[59990, 1]] }) } });
export const requireMarket = async () => market; export const tradingKeyCheck = async () => ({ ok: true });
export const preflight = async () => ({ ok: true, message: "ok" }); export const somiPerStop = async () => 3n * 10n ** 17n;
export const ensureLeverage = async () => ({ changed: false, from: 2, to: 2, dryRun: true });
export const positionIn = async () => ({ side: process.env.HELD, contracts: 0.001 });
export const liveMark = async () => 60000; export const markOf = () => 60000; export const pendingStops = async () => [];
export const armBracket = async (a) => { console.log("armBracket position=" + a.position, "takeProfit=" + Number(a.takeProfit) / 1e18, "stopLoss=" + Number(a.stopLoss) / 1e18); return { sent: false }; };
export const cancelStops = async () => {}; export const closePosition = async () => {}; export const placePerp = async () => ({ sent: false, filled: 0n });
export const shutdown = async () => {}; export const sizeForNotional = () => 1n; export const sizeOrder = async () => ({ ok: true, quantity: 1n }); export const sleep = async () => {};
```
2. From `<kit>/strategies/perp-starter`: `HELD=short <kit>/node_modules/.bin/tsx --import k/hook.mjs src/index.ts`

## Expected
The account already holds a SHORT, and the bot says it is "managing it instead of opening another". A short's take-profit sits below the mark and its stop-loss above it, and the bracket must be armed with `position: "short"`.

## Actual
```
already short 0.001 BTC, managing it instead of opening another
armBracket position=long takeProfit=61199.99999999999 stopLoss=59400
```
`SIDE` comes only from `PERP_SIDE` (default `long`). The `existing` branch logs the real side but never uses it; the bracket, the `watchedExits` price test (`hitTakeProfit` / `hitStopLoss`) and the printed levels all use `SIDE`. On a short, the "take-profit" at +2 % is a loss exit and the "stop-loss" at -1 % is a profit exit with the opposite trigger operators, so with armed stops the position is closed at a loss on the first adverse tick and the protection against a rally is missing. In trading-key mode (`watchedExits`) the bot closes the short as soon as the mark falls 1 %, i.e. while it is winning.

## Evidence
`strategies/perp-starter/src/index.ts`: `const existing = ... positionIn(...)`, then `armBracket({ ..., position: SIDE, takeProfit, stopLoss })` and the `SIDE === "long" ? ...` tests in the watch loop. Restarting the bot after a manual or earlier-session position of the other side is the normal way to reach this.

## Environment
dreamdex-bot-kit main, Node 22 (module.register hooks), tsx; stubbed perp-core, nothing sent.
