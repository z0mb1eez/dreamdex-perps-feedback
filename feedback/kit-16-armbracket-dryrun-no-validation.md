# dreamdex-bot-kit `armBracket` dry-run accepts an inverted take-profit/stop-loss and prints a hardcoded "0.30 SOMI locked", although the file says the stop deposit must be read, not hardcoded
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit && npm install`
2. Save as `packages/perp-core/br.ts` and run `npx tsx br.ts` from `packages/perp-core`:
```ts
import { armBracket } from "./src/stops.ts";
const market:any={display:"BTC-PERP",info:{tickSize:"1000000000000000000",stopRegistry:"0x0",poolAddress:"0x0"}};
const E=10n**18n;
// LONG position with take-profit (90) BELOW stop-loss (110): inverted
console.log(await armBracket({ctx:{exchange:{} as any,config:{dryRun:true,operatorRegistry:"0x0"}},
  market, position:"long", takeProfit:90n*E, stopLoss:110n*E}));
```

## Expected
`armBracket` validates the geometry it documents (a long takes profit ABOVE the mark and stops out below; the registry requires the legs to straddle) and fails in dry-run exactly as the live registry would. The SOMI figure should come from `somiPerStop()`, which the same file says exists because the value "is registry configuration" and must be "read rather than hardcoded".

## Actual
```
[dry-run] would arm a long bracket on BTC-PERP: take-profit 90.00, stop-loss 110.00, whole position, 0.30 SOMI locked
{ sent: false }
```
Dry-run (the kit's default mode, DRY_RUN defaults to true) reports success for a bracket that the live registry rejects with "not straddling" (the comment in the source admits this), so a bot validated in dry-run fails only once it is switched live. The `0.30 SOMI` is a string literal in the dry-run log; if the registry's deposit is changed the dry-run message will be wrong while `somiPerStop` (same file) would be right.

## Evidence
`packages/perp-core/src/stops.ts`, `armBracket`: the `tpOperator/slOperator` and `upper/lower` lines only reject equal prices; the dry-run branch returns before any check against the mark price or against take-profit/stop-loss ordering relative to `position`. Output above is from an unmodified checkout.

## Environment
dreamdex-bot-kit main, packages/perp-core, Node 22, tsx.
