# dreamdex-bot-kit `placePerp`: `slippageBps` is documented as "Ignored for resting orders" but is applied to LIMIT orders, moving a maker's price through the touch
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit && npm install`
2. Save as `packages/perp-core/pp.ts` and run `npx tsx pp.ts` from `packages/perp-core`:
```ts
import { placePerp } from "./src/orders.ts";
const E=10n**18n;
const market:any={display:"BTC-PERP",symbol:"BTC-PERP",info:{tickSize:"1000000000000000",baseDecimals:18,baseSymbol:"BTC",poolAddress:"0x0"}};
const ctx:any={config:{dryRun:true}};
await placePerp({ctx,market,side:"long", price:100n*E,quantity:E,slippageBps:50}); // orderType omitted => LIMIT (rests)
await placePerp({ctx,market,side:"short",price:100n*E,quantity:E,slippageBps:50});
```

## Expected
The `PlaceArgs.slippageBps` doc comment in `packages/perp-core/src/orders.ts` says: "Ignored for resting orders, where the price is the whole point." A LIMIT bid at 100 should stay at 100.

## Actual
```
[dry-run] would place order long 1 BTC @ 100.5
[dry-run] would place order short 1 BTC @ 99.5
```
The code computes `slip = args.slippageBps ?? (taker ? 20 : 0)` and applies it whenever it is non-zero; only the *default* depends on order type. So an explicit `slippageBps` on a LIMIT order shifts a maker's bid up / ask down by that many bps, i.e. through the touch, turning a passive quote into a marketable one that pays the spread (and, with POST_ONLY, makes it revert `PostOnlyWouldCross`). Callers who share one options object between maker and taker paths (a natural use of the field) are hit by this.

## Evidence
Output above from an unmodified checkout; source: `placePerp` in `packages/perp-core/src/orders.ts` (the `taker` / `slip` / `adjusted` lines) versus the `PlaceArgs.slippageBps` comment.

## Environment
dreamdex-bot-kit main, packages/perp-core, Node 22, tsx.
