# dreamdex-bot-kit ec-core `FAUCET_ENABLED=0` (or `no`, `off`) leaves the faucet ENABLED, unlike `DRY_RUN` and `AUTO_CLAIM` in the same package which accept `0`
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
import { loadConfig } from "<kit>/packages/ec-core/src/config.ts";
for (const v of ["false", "0", "no", "off", "FALSE"]) {
  process.env.FAUCET_ENABLED = v;
  console.log(`FAUCET_ENABLED=${v} ->`, loadConfig().faucetEnabled);
}
```
3. Run `npx tsx repro.mts`

## Expected
`0`/`no`/`off`/`FALSE` disable the faucet consistently with `DRY_RUN` (`!== "false" && !== "0"`) in the same function.

## Actual
```
FAUCET_ENABLED=false -> false
FAUCET_ENABLED=0 -> true
FAUCET_ENABLED=no -> true
FAUCET_ENABLED=off -> true
FAUCET_ENABLED=FALSE -> true
```
Only the exact lowercase string `false` disables it. `seedInventory` then calls `exchange.trader.faucet()` and `mintSet` whenever collateral is below 1000 units, on a network the user thought was faucet-free.

## Evidence
`packages/ec-core/src/config.ts` lines ~196-198: `process.env.FAUCET_ENABLED !== undefined ? process.env.FAUCET_ENABLED !== "false" : network !== "mainnet"`; consumer `packages/ec-core/src/inventory.ts` (`config.faucetEnabled`).

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
