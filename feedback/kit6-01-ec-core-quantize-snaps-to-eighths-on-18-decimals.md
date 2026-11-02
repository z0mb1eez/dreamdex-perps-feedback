# dreamdex-bot-kit ec-core `quantize()` rounds sizes down to multiples of 1/8 on an 18-decimal venue (mainnet), so a 0.1 share order becomes 0.094 and 19.99 becomes 19.875

Severity: major
Area: SDK

## Steps to reproduce
1. In a clone of the kit with dependencies installed, save `q.mts` (imports the kit's own `packages/ec-core/src/markets.ts`; no network, no key):
```ts
import { quantize } from "<kit>/packages/ec-core/src/markets.ts";
const mk = (decimals: number, lot: bigint) => ({ config: { decimals, lot } }) as any;
const mainnet = mk(18, 1_000_000_000_000_000n);   // loadConfig() defaults for NETWORK=mainnet: DECIMALS 18, MM_LOT 1e15
const testnet = mk(6, 1000n);                     // testnet defaults
for (const v of [0.1, 0.3, 0.7, 1.1, 5, 0.29, 2.3, 4.35, 19.99, 123.456])
  console.log("mainnet", v, "->", quantize(mainnet, v), "| testnet", quantize(testnet, v));
```
2. `<kit>/node_modules/.bin/tsx q.mts`

## Expected
`quantize` is documented as "snap DOWN to the venue lot grid". With a lot of 1e15 raw (0.001 share) the result for 0.1 is 0.1, for 19.99 it is 19.99.

## Actual
```
mainnet 0.1 -> 0.094 | testnet 0.1
mainnet 0.3 -> 0.25 | testnet 0.3
mainnet 0.7 -> 0.625 | testnet 0.7
mainnet 1.1 -> 1 | testnet 1.1
mainnet 5 -> 5 | testnet 5
mainnet 0.29 -> 0.25 | testnet 0.29
mainnet 2.3 -> 2.25 | testnet 2.3
mainnet 4.35 -> 4.25 | testnet 4.35
mainnet 19.99 -> 19.875 | testnet 19.99
mainnet 123.456 -> 123.375 | testnet 123.456
```
Only values that are exactly representable in binary (multiples of 1/8 such as 5, 0.25, 2.25) pass. Everything else loses up to 12.5%, and a request of 0.1 loses 6%.

## Cause
`quantize()` builds each candidate with `toRawUnits(size, decimals)`, which is `human.toFixed(decimals)`. At 18 decimals `toFixed(18)` prints the binary float's exact expansion (`(0.1).toFixed(18)` is `0.100000000000000006`), so the raw value is not a multiple of the 1e15 lot. The check `toRawUnits(size, decimals) % lot === 0n` fails, and the `for (let n = lots; n >= 1; n--)` loop walks down one lot at a time until it lands on a dyadic value. On testnet (6 decimals) `toFixed(6)` is clean, which is why the testnet tests pass.

## Impact
Every ec-* strategy sizes through `quantize` (ec-starter, ec-maker, ec-laddering-bot, ec-oracle-follow `budget`, ec-passive; ec-laddering `flatten` burns `quantize(min(yes,no))` sets and leaves the rest). On mainnet, orders and burns are silently smaller than requested, and the 0.001 lot grid the config advertises is effectively 0.125.

## Environment
dreamdex-bot-kit main, Node 22, tsx; pure computation, nothing sent.
