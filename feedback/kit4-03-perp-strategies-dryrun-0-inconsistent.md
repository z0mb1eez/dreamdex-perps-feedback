# dreamdex-bot-kit perp strategies derive "live" with `DRY_RUN === "false"` but perp-core's `envBool` also treats `DRY_RUN=0` as live, so `DRY_RUN=0` trades live while skipping the signer and link/abort checks
Severity: normal
Area: SDK

## Steps to reproduce
1. Save `k1.ts` (it copies the exact expression used by `strategies/perp-maker`, `perp-guard`, `perp-funding` and `perp-starter` and calls the real `createExchange`; no PRIVATE_KEY is set):
```ts
import { createExchange } from "<kit>/packages/perp-core/src/index.ts";
process.env.NETWORK = "hideki"; delete process.env.PRIVATE_KEY;
for (const v of ["false", "0"]) {
  process.env.DRY_RUN = v;
  const live = process.env.DRY_RUN === "false";
  try { const c = createExchange({ withSigner: live }); console.log(`DRY_RUN=${v}: live=${live} config.dryRun=${c.config.dryRun} canTrade=${c.canTrade} -> no error`); }
  catch (e: any) { console.log(`DRY_RUN=${v}: live=${live} -> throws: ${e.message.slice(0, 60)}`); }
}
```
2. `<kit>/node_modules/.bin/tsx k1.ts`

## Expected
One definition of "live". `loadConfig()` uses `envBool("DRY_RUN", true)` ("Anything but false/0 reads as true", so `0` is live), so `DRY_RUN=0` should behave exactly like `DRY_RUN=false` everywhere.

## Actual
```
DRY_RUN=false: live=true -> throws: PRIVATE_KEY is required for trading. Set it in .env, or run
DRY_RUN=0: live=false config.dryRun=false canTrade=false -> no error
```
With `DRY_RUN=0` the config says dry-run is off (orders are sent, e.g. `closePosition` / `placePerp` check `ctx.config.dryRun`), but each strategy's local `const live = process.env.DRY_RUN === "false"` is false. Consequences in the strategies: `createExchange({ withSigner: live })` skips the "PRIVATE_KEY is required" early failure, and `if (!link.ok && live) process.exit(1)` (perp-maker, perp-guard "cannot trade on any perp market") does not exit, so an unlinked key goes on to fail every order instead of stopping at startup.

## Evidence
`strategies/perp-maker/src/index.ts:79`, `perp-guard/src/index.ts:83`, `perp-funding/src/index.ts:57`, `perp-starter/src/index.ts:65` vs `packages/perp-core/src/config.ts` line 177 `dryRun: envBool("DRY_RUN", true)`. Suggested fix: use `!ctx.config.dryRun` (read config first) instead of re-parsing the env var.

## Environment
dreamdex-bot-kit main, Node 22, tsx; no network, no key.
