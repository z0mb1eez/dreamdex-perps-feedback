# dreamdex-bot-kit backtest `applyConfigOverrides` (`--set KEY=VALUE`) silently accepts misspelt keys and turns an empty value for a numeric key into 0
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
import { applyConfigOverrides } from "<kit>/packages/backtest/src/config-overrides.ts";
const base = { spreadBps: 10, notionalUsdso: 25, dryRun: true };
console.log("typo key   :", applyConfigOverrides(base, { spredBps: "2" }));
console.log("empty value:", applyConfigOverrides(base, { notionalUsdso: "" }));
console.log("yes -> bool:", applyConfigOverrides(base, { dryRun: "yes" }));
```
3. Run `npx tsx repro.mts`

## Expected
A key that is not in the strategy config is rejected (like the non-numeric case already is: `--set X=abc is not a number`), an empty string for a number is rejected, and boolean parsing is strict.

## Actual
```
typo key   : { spreadBps: 10, notionalUsdso: 25, dryRun: true, spredBps: 2 }
empty value: { spreadBps: 10, notionalUsdso: 0, dryRun: true }
yes -> bool: { spreadBps: 10, notionalUsdso: 25, dryRun: false }
```
The typo creates a new unused key (the run uses the default spread and the user thinks they tested 2 bps), `notionalUsdso=""` becomes 0 (Number("") === 0), and `yes` is silently read as false.

## Evidence
`packages/backtest/src/config-overrides.ts` lines ~20-23 (`if (!(key in base)) { out[key] = coerce(raw); continue; }`), ~26 (`Number(raw)` with no empty-string guard) and ~32-34 (`s === "1" || s === "true"`). Parameter sweeps built on this give results for the default config under a different label.

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
