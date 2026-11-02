# dreamdex-bot-kit `strategies/ec-starter`: once |net| reaches `TAKE_MAX_POSITION` the bot returns before choosing a side, so it can never trade back toward flat

Severity: normal
Area: SDK

## Steps to reproduce
1. In a clone of the kit save these three files in an empty dir `k/` (they replace `@dreamdex-bot-kit/ec-core` with a stub through a Node resolve hook, so the real `strategies/ec-starter/src/index.ts` runs unchanged; nothing touches a network):

`k/hook.mjs`
```js
import { register } from "node:module";
register("./resolve.mjs", import.meta.url);
```
`k/resolve.mjs`
```js
export async function resolve(spec, ctx, next) {
  if (spec === "@dreamdex-bot-kit/ec-core") return { url: new URL("./ecstub.mjs", import.meta.url).href, shortCircuit: true };
  return next(spec, ctx);
}
```
`k/ecstub.mjs`
```js
const NET = Number(process.env.STUB_NET ?? 0);
const market = { symbol: "BTC-X", info: { marketType: "BINARY", intervalSec: 300 }, outcomes: [{ symbol: "BTC-X#YES" }, { symbol: "BTC-X#NO" }] };
export const envNum = (n, f) => (process.env[n] ? Number(process.env[n]) : f);
export const loadConfig = () => ({ dryRun: false });
export const createExchange = () => ({ config: { dryRun: false }, exchange: { walletAddress: "0x1", close() {},
  fetchOrderBook: async () => ({ bids: [[0.48, 10]], asks: [[0.52, 10]] }), priceToPrecision: (s, p) => String(p) } });
export const maybeClaim = async () => {}; export const activeMarkets = async () => [market];
export const explainEmptyScope = async () => ""; export const isTradable = () => true; export const minLeftSec = () => 0;
export const marketOnchain = async () => ({ status: 1, expiry: BigInt(Math.floor(Date.now() / 1000) + 100000) });
export const netPosition = async () => NET; export const outcomeSymbols = () => ({ yes: "BTC-X#YES", no: "BTC-X#NO" });
export const seedInventory = async () => {}; export const quantize = (c, h) => h; export const assertProbability = () => {};
export const clampProbability = (p) => p; export const sellableSize = async (c, o, out, want) => want;
export const placeLimit = async (c, a) => { console.log("PLACE", a.side, a.size, "@", a.price.toFixed(3), "(net", NET + ")"); return { rested: false, filled: a.size, size: a.size, price: a.price }; };
export const cancelTracked = async () => ({ cancelled: 0, tracked: 0 }); export const cancelVenueOrders = async () => 0; export const shutdown = async () => {};
```
2. From `<kit>/strategies/ec-starter`, for each of `STUB_NET=-19`, `-20`, `20`:
`STUB_NET=-20 TAKE_INTERVAL_MS=200 TAKE_MAX_POSITION=20 timeout -s TERM 2 <kit>/node_modules/.bin/tsx --import k/hook.mjs src/index.ts > out.txt; grep -c PLACE out.txt`

## Expected
At a net of -20 shares (short YES) the cap should stop the bot from adding more shorts but still allow it to BUY, which is the only way to come back inside the cap. ec-maker and ec-laddering-bot already implement it that way (`skipBid = net >= MAX_NET`, `skipAsk = net <= -MAX_NET`).

## Actual
```
== STUB_NET=-19      PLACE buy 5 @ 0.522 (net -19)   PLACE sell 5 @ 0.478 (net -19)   (total PLACE: 5)
== STUB_NET=-20      (total PLACE: 0)
== STUB_NET=20       (total PLACE: 0)
```
`takeOne()` does `if (Math.abs(net) >= MAX_POSITION) return;` before the random buy/sell choice, so at the cap both directions are blocked. Because the side is a coin flip, |net| is a random walk and reaches the cap in a long run; from then on the bot idles for the life of the process (until the market rolls and a different symbol is picked) and never trades the position back.

## Evidence
`strategies/ec-starter/src/index.ts`, `takeOne`: the `Math.abs(net)` early return, versus `strategies/ec-maker/src/index.ts` which computes `skipBid` / `skipAsk` per side.

## Environment
dreamdex-bot-kit main, Node 22 (module.register hooks), tsx; stubbed ec-core, nothing sent.
