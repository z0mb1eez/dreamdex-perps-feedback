# dreamdex-bot-kit perp-core `armBracket` does not check that take-profit / stop-loss are on the correct side of each other for the position, so an inverted bracket is sent and triggers immediately
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
import { armBracket } from "<kit>/packages/perp-core/src/stops.ts";
let sent: any;
const exchange: any = { trader: { placePerpStopOrder: async (a: any) => { sent = a; return { stopOrderId: 1n, pairedStopOrderId: 2n }; } } };
const market: any = { display: "BTC-PERP", info: { tickSize: "1000000000000000000", stopRegistry: "0x0", poolAddress: "0x0" } };
const E18 = 10n ** 18n;
// LONG position, mark ~100.  Arguments swapped by mistake: takeProfit 90, stopLoss 110.
const r = await armBracket({ ctx: { exchange, config: { dryRun: false, operatorRegistry: "0x1" as any } }, market,
  position: "long", takeProfit: 90n * E18, stopLoss: 110n * E18 });
console.log("sent:", r.sent);
console.log("take-profit leg: trigger", sent.triggerPrice / E18, "operator", sent.triggerOperator, "(0 = price >= trigger)");
console.log("stop-loss   leg: trigger", sent.pair.triggerPrice / E18, "operator", sent.pair.triggerOperator, "(1 = price <= trigger)");
```
3. Run `npx tsx repro.mts`

## Expected
For a long, `takeProfit` must be above `stopLoss` (reverse for a short); otherwise throw before spending the SOMI lock, the same way the function already throws when both resolve to the same trigger.

## Actual
```
armed a long bracket on BTC-PERP: take-profit 90.00 (#1), stop-loss 110.00 (#2)
sent: true
take-profit leg: trigger 90n operator 0 (0 = price >= trigger)
stop-loss   leg: trigger 110n operator 1 (1 = price <= trigger)
```
The bracket is armed. With a mark around 100, `price >= 90` (take-profit) and `price <= 110` (stop-loss) are both already true, so both reduce-only market stops fire at once and the position is closed at market immediately.

## Evidence
`packages/perp-core/src/stops.ts` lines ~66-76 only compute `upper`/`lower` for the equality check and do not validate ordering against `position`; no mark-price sanity check either. Caller strategies (`perp-starter`, `perp-maker`) compute the prices from env percentages, so a negative or swapped percentage reaches this path.

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
