# dreamdex-bot-kit ec-core `loadConfig` treats any NETWORK value other than exactly `mainnet` as testnet (typos and stray whitespace), while the other families reject unknown networks
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
import { loadConfig } from "<kit>/packages/ec-core/src/config.ts";
for (const v of ["mainet", " mainnet", "MAINNET ", "prod"]) {
  process.env.NETWORK = v;
  const c = loadConfig();
  console.log(JSON.stringify(v), "->", c.network, "chain", c.chainId, c.rpcUrl);
}
```
3. Run `npx tsx repro.mts`

## Expected
An unrecognised NETWORK throws, as `core/getNetwork()` (`Invalid NETWORK=...`) and `perp-core/loadConfig` do. Whitespace is trimmed (perp-core trims).

## Actual
```
"mainet" -> testnet chain 50312 https://api.infra.testnet.somnia.network
" mainnet" -> testnet chain 50312 https://api.infra.testnet.somnia.network
"MAINNET " -> testnet chain 50312 https://api.infra.testnet.somnia.network
"prod" -> testnet chain 50312 https://api.infra.testnet.somnia.network
```
All four values quietly run on testnet (chain 50312). A user who meant mainnet and mistyped it gets a bot that happily trades the testnet faucet market and reports success; conversely `DRY_RUN=false` with a mistyped mainnet value still sends real transactions, to the wrong network, and the mismatch is only visible in the startup banner.

## Evidence
`packages/ec-core/src/config.ts` lines ~168-170: `const raw = (process.env.NETWORK ?? process.env.DEPLOY_ENV ?? "testnet").toLowerCase(); const network = raw === "mainnet" ? "mainnet" : "testnet";`

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
