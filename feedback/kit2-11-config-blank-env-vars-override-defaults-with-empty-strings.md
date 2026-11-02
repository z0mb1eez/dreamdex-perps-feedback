# dreamdex-bot-kit core / ec-core / perp-core use `process.env.RPC_URL ?? default`, so a blank `RPC_URL=` (as copied from a template .env) replaces the endpoint with an empty string instead of the default
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
// run as:  RPC_URL= WS_RPC_URL= INDEXER_URL= REST_API_URL= npx tsx blank.mts
import { NETWORKS } from "<kit>/packages/core/dist/index.js";
import { loadConfig as ec } from "<kit>/packages/ec-core/src/config.ts";
import { loadConfig as perp } from "<kit>/packages/perp-core/src/config.ts";
console.log("core testnet  rpcUrl/restApi:", JSON.stringify([NETWORKS.testnet.rpcUrl, NETWORKS.testnet.restApi]));
const e = ec();   console.log("ec-core       rpc/ws/indexer:", JSON.stringify([e.rpcUrl, e.wsRpcUrl, e.indexerUrl]));
const p = perp(); console.log("perp-core     rpc/ws/indexer:", JSON.stringify([p.rpcUrl, p.wsRpcUrl, p.indexerUrl]));
```
3. Run `RPC_URL= WS_RPC_URL= INDEXER_URL= REST_API_URL= npx tsx repro.mts`

## Expected
Blank variables are treated as unset (the same files already do this for PRIVATE_KEY, OWNER_ADDRESS, VENUE_ID via `.trim()` + truthiness, and `envNum` treats blank as unset).

## Actual
```
core testnet  rpcUrl/restApi: ["",""]
ec-core       rpc/ws/indexer: ["","",""]
perp-core     rpc/ws/indexer: ["","",""]
```
Every endpoint becomes an empty string; the failure shows up later as a viem transport error (`Invalid URL` / failed fetch) from deep inside the first read, not as a config problem.

## Evidence
`packages/core/src/config/networks.ts` lines ~38-40 and ~48-50, `packages/ec-core/src/config.ts` lines ~181-183, `packages/perp-core/src/config.ts` lines ~170-172: `process.env.X ?? default` should be `process.env.X?.trim() || default`. Run with `RPC_URL= REST_API_URL= WS_RPC_URL= INDEXER_URL= npx tsx blank.mts`.

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
