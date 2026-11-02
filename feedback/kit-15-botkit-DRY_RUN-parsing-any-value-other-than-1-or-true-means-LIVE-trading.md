# dreamdex-bot-kit spot strategies parse DRY_RUN with `v === "1" || v.toLowerCase() === "true"`: DRY_RUN=yes / on / y / enabled (and a stray typo) silently switches to LIVE trading, while the perp strategies treat everything except "false" as dry-run
Severity: major
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit && npm install` (no key or network needed; this only imports a config module).
2. For each value run the momentum strategy's config under tsx:
```
cd strategies/momentum
for v in yes on TRUE "" 1 0 false no; do echo "DRY_RUN='$v' -> $(DRY_RUN="$v" npx tsx -e 'import {config} from "./src/config.ts"; console.log("momentum dryRun="+config.dryRun)' 2>&1 | tail -1)"; done
```
3. Compare `strategies/perp-funding/src/index.ts` (`const live = process.env.DRY_RUN === "false"`), `perp-maker`, `perp-guard`, `perp-starter`, and `packages/ec-core/src/config.ts` (`(DRY_RUN ?? "true") !== "false" && DRY_RUN !== "0"`).

## Expected
The documentation (README and `docs/getting-started.md`) says every strategy defaults to DRY_RUN=true and you "flip DRY_RUN=false" to go live. An ambiguous or unrecognised value should fail safe (stay in dry-run) or be rejected, and all strategies should parse the flag the same way.

## Actual
```
DRY_RUN='yes'   -> momentum dryRun=false     (LIVE)
DRY_RUN='on'    -> momentum dryRun=false     (LIVE)
DRY_RUN='TRUE'  -> momentum dryRun=true
DRY_RUN=''      -> momentum dryRun=true
DRY_RUN='1'     -> momentum dryRun=true
DRY_RUN='0'     -> momentum dryRun=false     (LIVE)
DRY_RUN='false' -> momentum dryRun=false     (LIVE)
DRY_RUN='no'    -> momentum dryRun=false     (LIVE)
```
The `bool()` helper copied into the nine spot strategy configs (market-making, momentum, mean-reversion, grid, twap, ensemble, treasury, yield-optimizer, starter) returns true only for exactly "1"/"true" (any case); every other non-empty string, including the natural dry-run spellings `yes`, `on`, `y`, `enabled` and a typo like `ture`, resolves to dryRun=false, i.e. real orders signed with the configured private key. The perp strategies use the opposite polarity (live only when the value is exactly "false"), so the same `.env` value can mean dry-run for a perp bot and live for a spot bot. Within the perp strategies the two checks also disagree with each other: `packages/perp-core/src/config.ts` `envBool` makes `DRY_RUN=0` mean `dryRun=false` (live orders), while `perp-guard`/`perp-funding`/`perp-maker`/`perp-starter` decide whether to create a signer with `process.env.DRY_RUN === "false"`, so `DRY_RUN=0` yields a bot that is configured to send orders but was built without a signer. Fix: parse booleans strictly (accept a fixed set, throw on anything else) and default to dry-run on unrecognised input.

## Evidence
Output above from the kit's `strategies/momentum/src/config.ts` under tsx, 2026-11-02; the helper source is the same in all nine spot configs (`function bool`).

## Environment
dreamdex-bot-kit main (strategies/*), Node 22, tsx.
