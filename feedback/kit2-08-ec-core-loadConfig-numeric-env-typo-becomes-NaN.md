# dreamdex-bot-kit ec-core `loadConfig` reads MM_INVENTORY / MM_MAX_MARKETS / DECIMALS / OPERATOR_ID with an unchecked `Number()`, so a typo yields NaN or an unlabelled RangeError although the same file's `envNum` is documented as the fix
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
import { loadConfig } from "<kit>/packages/ec-core/src/config.ts";
process.env.MM_INVENTORY = "abc"; process.env.MM_MAX_MARKETS = "8x"; process.env.DECIMALS = "six"; process.env.OPERATOR_ID = "abc";
const c: any = loadConfig();
console.log("inventory:", c.inventory, "maxMarkets:", c.maxMarkets, "decimals:", c.decimals, "operatorId:", c.operatorId);
for (const k of ["MM_INVENTORY", "MM_MAX_MARKETS", "DECIMALS", "OPERATOR_ID"]) delete process.env[k];
process.env.MM_TICK = "0.5";
try { loadConfig(); } catch (e: any) { console.log("MM_TICK=0.5 ->", e.constructor.name + ":", e.message); }
```
3. Run `npx tsx repro.mts`

## Expected
A clear `MM_INVENTORY="abc" is not a number` error at startup (what `envNum` in the same file does, and what its doc comment promises: 'Anything set but not a number is a configuration error and says so').

## Actual
```
inventory: NaN maxMarkets: NaN decimals: NaN operatorId: NaN
MM_TICK=0.5 -> RangeError: The number 0.5 cannot be converted to a BigInt because it is not an integer
```
The config loads with NaN values. NaN then flows into sizes (`toRaw`/`toSteps`: `BigInt(NaN)` RangeError mid-run), `maxMarkets` slicing and the decimals used for every `10n ** BigInt(decimals)` computation. MM_TICK/MM_LOT with a decimal throw a bare `RangeError` that does not name the variable.

## Evidence
`packages/ec-core/src/config.ts` line 47: `const num = (name, def) => (process.env[name] ? Number(process.env[name]) : def);` used for CHAIN_ID, DECIMALS, MM_TICK, MM_LOT, MM_INVENTORY, MM_MAX_MARKETS (lines ~184-205); line ~187 `operatorId ? Number(operatorId)`. `envNum` (line ~109) is exported and validated but never used by `loadConfig`.

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
