# dreamdex-bot-kit perp-core `ensureLeverage` ignores the receipt of `setPerpLeverage` and reports `changed: true` when the transaction reverted
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
import { ensureLeverage } from "<kit>/packages/perp-core/src/margin.ts";
const exchange: any = {
  client: { getPerpMaxLeverage: async () => 0 },
  trader: { setPerpLeverage: async () => ({ hash: "0xabc", receipt: { status: "reverted" } }) },   // the SDK resolves on a reverted receipt
};
const market: any = { display: "BTC-PERP", info: { marginBank: "0x0", poolAddress: "0x0" } };
console.log(await ensureLeverage({ exchange, config: { dryRun: false } }, market, "0x0000000000000000000000000000000000000001", 5));
```
3. Run `npx tsx repro.mts`

## Expected
A reverted `setPerpLeverage` throws (via the package's own `assertTxOk`, whose doc says 'The SDK does not throw on a reverted receipt') or at least returns `changed: false`.

## Actual
```
{ changed: true, from: 0, to: 5 }
```
Returns `{ changed: true, from: 0, to: 5 }`. Strategies (`perp-funding`, `perp-starter`) go on to size positions assuming the 5x lever, whereas the account still has none set (or a different one), so the initial-margin the bot budgeted for is wrong.

## Evidence
`packages/perp-core/src/margin.ts` line ~194 `await ctx.exchange.trader.setPerpLeverage({...}); return { changed: true, ... }` - the result is discarded; `assertTxOk` from `exchange.ts` is imported nowhere in `margin.ts`.

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
