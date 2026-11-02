# dreamdex-bot-kit core `NETWORKS` reads RPC_URL / REST_API_URL / WS_URL from `process.env` at module-import time, so values set in a `.env` file (loaded afterwards by `loadEnv()`) are ignored
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("./envdir", { recursive: true });
writeFileSync("./envdir/.env", "REST_API_URL=https://example.invalid/v0\nRPC_URL=https://my-rpc.invalid\nNETWORK=mainnet\n");
const { NETWORKS, getNetwork, loadEnv } = await import("<kit>/packages/core/dist/index.js");   // import first, as every strategy does
loadEnv("./envdir");
console.log("process.env.RPC_URL      :", process.env.RPC_URL);
console.log("getNetwork().name        :", getNetwork().name, "(NETWORK is read lazily, so it works)");
console.log("NETWORKS.mainnet.rpcUrl  :", NETWORKS.mainnet.rpcUrl);
console.log("NETWORKS.mainnet.restApi :", NETWORKS.mainnet.restApi);
```
3. Run `npx tsx repro.mts`

## Expected
`RPC_URL`, `REST_API_URL` and `WS_URL` from `.env` take effect, like `NETWORK` (read lazily in `getNetwork()`) does. The strategies call `loadEnv()` at the top of `config.ts`, but ES imports are hoisted, so `networks.ts` has already run.

## Actual
```
process.env.RPC_URL      : https://my-rpc.invalid
getNetwork().name        : mainnet (NETWORK is read lazily, so it works)
NETWORKS.mainnet.rpcUrl  : https://api.infra.mainnet.somnia.network
NETWORKS.mainnet.restApi : https://api.dreamdex.io/v0
```
`.env` overrides for the RPC and API endpoints are ignored; the bot keeps using the hard-coded defaults and only a variable exported in the shell (before `node` starts) works. Users who point the bot at a private RPC or a staging API via `.env` silently trade through the public ones.

## Evidence
`packages/core/src/config/networks.ts` lines ~36-50 build the `NETWORKS` object eagerly with `process.env.RPC_URL ?? ...`. Making `rpcUrl/restApi/wsUrl` getters (or resolving inside `getNetwork()`) fixes it. The same RPC_URL variable is also applied to BOTH mainnet and testnet entries.

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
