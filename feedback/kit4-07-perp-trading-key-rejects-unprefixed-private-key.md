# dreamdex-bot-kit perp-core `PRIVATE_KEY` without a `0x` prefix is rejected in trading-key mode (OWNER_ADDRESS) with a raw viem error, while `packages/core` accepts it
Severity: normal
Area: SDK

## Steps to reproduce
1. Save `g.mts` (the key is a throwaway all-`11` test value; nothing is sent):
```ts
import { createTradingKey } from "<kit>/packages/perp-core/src/operator.ts";
import { createChainContext } from "<kit>/packages/core/src/client.ts";
const hex = "11".repeat(32);
process.env.NETWORK = "testnet";
try { createChainContext(hex); console.log("core: accepts key without 0x"); } catch (e: any) { console.log("core:", e.message.slice(0, 80)); }
try { createTradingKey({ owner: "0x0000000000000000000000000000000000000002", privateKey: hex as any, chain: { id: 1 } as any, rpcUrl: "http://x" }); console.log("perp-core: ok"); } catch (e: any) { console.log("perp-core:", e.message.split("\n")[0].slice(0, 100)); }
```
2. `<kit>/node_modules/.bin/tsx g.mts`

## Expected
The same `PRIVATE_KEY` format is accepted across the kit's packages. `core/src/client.ts` normalises with `key.startsWith("0x") ? key : "0x" + key`; perp-core should do likewise (or `loadConfig` should validate and say "PRIVATE_KEY must start with 0x").

## Actual
```
core: accepts key without 0x
perp-core: invalid private key, expected hex or 32 bytes, got string
```
`loadConfig()` in `packages/perp-core/src/config.ts` casts the trimmed env value (`pk as \`0x${string}\``) without validation, so the failure surfaces later from viem's `privateKeyToAccount` with a message that does not name `PRIVATE_KEY` or mention the missing prefix. A key copied from many wallet exports (no `0x`) works for spot bots and breaks the perp bots.

## Evidence
`packages/perp-core/src/config.ts` (`privateKey: pk ? (pk as ...) : undefined`) and `packages/perp-core/src/operator.ts` `createTradingKey` vs `packages/core/src/client.ts` `createChainContext`.

## Environment
dreamdex-bot-kit main, Node 22, tsx, viem from the lockfile.
