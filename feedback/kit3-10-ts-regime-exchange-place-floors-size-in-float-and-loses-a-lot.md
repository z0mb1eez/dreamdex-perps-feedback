# dreamdex-bot-kit 08-regime-multistrategy `DreamDexClient._place` floors the size with `Math.floor(size / lot) * lot`, so exact multiples of the lot lose one lot (0.0029 -> 0.0028) and `depositBaseToVault` sends `0.30000000000000004`
Severity: normal
Area: SDK

## Steps to reproduce
Run with the kit's tsx. The script instantiates the real `DreamDexClient`, injects a market (tick 0.01, lot 0.0001) and a fake `authedJson` that records the POST body (empty tx answer, nothing is signed or sent).
```ts
import { DreamDexClient } from "/tmp/dd/dreamdex-bot-kit/examples/08-regime-multistrategy/src/exchange.ts";
const c: any = new DreamDexClient({ rpc: "x", privateKey: "0x" + "11".repeat(32) });
c.markets["WETH:USDso"] = { symbol: "WETH:USDso", tickSize: "0.01", lotSize: "0.0001", minQuantity: "0.0001", baseDecimals: 18, quoteDecimals: 18, base: "0x" + "22".repeat(20), contract: "0x" + "33".repeat(20) };
c.approved["WETH:USDso"] = true;
const bodies: any[] = [];
c.authedJson = async (_u: string, o: any) => { bodies.push(JSON.parse(o.body)); return {}; };   // API answers with an empty tx
const origLog = console.log; console.log = () => {};
// desired sizes are exact multiples of the lot (0.0029 = 29 lots, 0.0058 = 58 lots, 0.0003 = 3 lots, 0.0007 = 7 lots)
for (const size of [0.0029, 0.0058, 0.0003, 0.0007, 0.0019]) await c.placeLimit("WETH/USDso", "sell", 3000, size, true);
console.log = origLog;
for (const [i, size] of [0.0029, 0.0058, 0.0003, 0.0007, 0.0019].entries())
  console.log(`requested size ${size} -> sent amount ${bodies[i].amount}${Number(bodies[i].amount) !== size ? "   <-- one lot lost" : ""}`);
```
Run: `cd <kit> && node_modules/.bin/tsx t1_place.mts`

## Expected
Sizes that are exact multiples of the lot are sent unchanged (`0.0029`, `0.0058`, `0.0003`).

## Actual
```
requested size 0.0029 -> sent amount 0.0028   <-- one lot lost
requested size 0.0058 -> sent amount 0.0057   <-- one lot lost
requested size 0.0003 -> sent amount 0.0002   <-- one lot lost
requested size 0.0007 -> sent amount 0.0007
requested size 0.0019 -> sent amount 0.0019
```
`0.0029 / 0.0001` is `28.999999999999996` in IEEE-754, so `Math.floor` gives 28 and the order is sent as `0.0028`; the same happens for 0.0058 and 0.0003. Consequences: every affected order is one lot smaller than the strategy asked for, and when the requested size is exactly `minQuantity` the floored size falls below `minQ` and `_place` returns `{ id: "" }` without sending the order ("below the minimum -> skip"); see the second run below. The same unrounded-float pattern is in `depositBaseToVault` (`Math.floor(amt / lot) * lot`, then `String(amt)`): with lot 0.1 it POSTs `amount: "0.30000000000000004"` to `/vault/deposit` (second and third runs below; the API's reaction to a sub-lot-precision deposit amount is not tested). Fix: use integer/decimal arithmetic (`Math.floor(size / lot + 1e-9)`, or scaled BigInt), and format with `toFixed`.

## Additional runs
Size equal to minQuantity (`t1b_min.mts`, same harness, minQuantity 0.0003):
```ts
import { DreamDexClient } from "/tmp/dd/dreamdex-bot-kit/examples/08-regime-multistrategy/src/exchange.ts";
const c: any = new DreamDexClient({ rpc: "x", privateKey: "0x" + "11".repeat(32) });
c.markets["WETH:USDso"] = { symbol: "WETH:USDso", tickSize: "0.01", lotSize: "0.0001", minQuantity: "0.0003", baseDecimals: 18, quoteDecimals: 18, base: "0x" + "22".repeat(20), contract: "0x" + "33".repeat(20) };
c.approved["WETH:USDso"] = true;
let posts = 0;
c.authedJson = async () => { posts++; return {}; };
const r = await c.placeLimit("WETH/USDso", "sell", 3000, 0.0003, true);   // exactly minQuantity
console.log("placeLimit(size == minQuantity == 0.0003) returned", JSON.stringify(r), "| POSTs sent:", posts);
```
```
placeLimit(size == minQuantity == 0.0003) returned {"id":""} | POSTs sent: 0
```
`depositBaseToVault` (`t2_deposit.mts`):
```ts
import { DreamDexClient } from "/tmp/dd/dreamdex-bot-kit/examples/08-regime-multistrategy/src/exchange.ts";
const c: any = new DreamDexClient({ rpc: "x", privateKey: "0x" + "11".repeat(32) });
c.markets["WETH:USDso"] = { symbol: "WETH:USDso", tickSize: "0.01", lotSize: "0.1", minQuantity: "0.1", baseDecimals: 18, quoteDecimals: 18, base: "0x" + "22".repeat(20), contract: "0x" + "33".repeat(20) };
c.approved["WETH:USDso"] = true;
c.signer = { getAddress: async () => "0x" + "44".repeat(20) };
const sent: any[] = [];
c.authedJson = async (url: string, o: any = {}) => {
  if (!o.method) return { markets: [{ symbol: "WETH:USDso", base: { wallet: "1.0", vault: "0" }, quote: { wallet: "0", vault: "0" } }] };  // wallet holds 1.0 WETH
  sent.push(JSON.parse(o.body)); return {};
};
const log = console.log; console.log = () => {};
await c.depositBaseToVault("WETH/USDso", 0.35 / 0.999);   // 0.35 base wanted; * 0.999 buffer then floor to lot (0.1)
await c.depositBaseToVault("WETH/USDso", 0.4);
console.log = log;
for (const b of sent) console.log("vault/deposit body amount =", JSON.stringify(b.amount));
```
```
vault/deposit body amount = "0.30000000000000004"
vault/deposit body amount = "0.30000000000000004"
```

## Evidence
Output above. Source: `examples/08-regime-multistrategy/src/exchange.ts` `_place` (~L406-411) and `depositBaseToVault` (~L304-308). The 0.0003-at-minQuantity skip follows directly from the printed `0.0002` vs `minQ` check (not run separately).

## Environment
dreamdex-bot-kit main @ 4e75896, examples/08-regime-multistrategy, Node 22, tsx from the kit's node_modules, no network and no key used (client fields stubbed).
