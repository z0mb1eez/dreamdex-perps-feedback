# Bot kit gotchas.md #13 says testnet reports a builder fee cap of 0; all three Shannon testnet spot pools report 100000 (1%)
Severity: normal
Area: docs

## Steps to reproduce
1. `mkdir t && cd t && npm init -y >/dev/null && npm pkg set type=module && npm i viem`
2. Save `cap.mjs`:
```js
import { createPublicClient, http, parseAbi } from 'viem';
const abi = parseAbi(['function getMaxBuilderFeeBpsTimes1k() view returns (uint256)']);
const nets = [
  ['mainnet', 'https://api.infra.mainnet.somnia.network', ['0x035De7403eac6872787779CCA7CCF1b4CDb61379','0x47fD2f18426f67106DBaC82F6d21D446c5F2120b','0x25bfF6B7B5E2243424F38E75de7ab03C0522a5EA','0xa936da11B57b50A344e1293AAaE5232885ea2bDE']],
  ['testnet', 'https://dream-rpc.somnia.network', ['0x259fD6559214dd5aD3752322426eA9F9fABEFff4','0x3605f28aA7C50e7441211e77Cb0762d49539326C','0xD180195da5459C7a0DEA188ed61216ec43682b50']],
];
for (const [n, rpc, pools] of nets) {
  const c = createPublicClient({ transport: http(rpc) });
  for (const p of pools) console.log(n, p, 'cap', await c.readContract({ address: p, abi, functionName: 'getMaxBuilderFeeBpsTimes1k' }));
}
```
(The pool addresses are exactly the `contract` fields of `GET https://api.dreamdex.io/v0/markets` and `GET https://stg.api.dreamdex.io/v0/markets`, and the `MARKETS` table in packages/core/src/config/tokens.ts.)
3. `node cap.mjs`

## Expected
dreamdex-bot-kit `docs/gotchas.md`, "13. This kit places orders without a builder code": "builder codes are enabled on mainnet - all four pools report `getMaxBuilderFeeBpsTimes1k() = 100000` (a 1% fee cap). **Testnet** currently reports a cap of `0`."

## Actual
Mainnet matches (100000 on all four pools). Testnet does not: all three Shannon testnet pools (SOMI:USDso, WBTC:USDso, WETH:USDso) report 100000 as well, so builder codes are enabled on testnet too. A reader following the doc would conclude builder fees cannot be tested on testnet and that any non-zero builder fee there would be rejected.

## Evidence
2026-11-02 ~09:10 UTC:
```
mainnet 0x035De7403eac6872787779CCA7CCF1b4CDb61379 cap 100000n
mainnet 0x47fD2f18426f67106DBaC82F6d21D446c5F2120b cap 100000n
mainnet 0x25bfF6B7B5E2243424F38E75de7ab03C0522a5EA cap 100000n
mainnet 0xa936da11B57b50A344e1293AAaE5232885ea2bDE cap 100000n
testnet 0x259fD6559214dd5aD3752322426eA9F9fABEFff4 cap 100000n
testnet 0x3605f28aA7C50e7441211e77Cb0762d49539326C cap 100000n
testnet 0xD180195da5459C7a0DEA188ed61216ec43682b50 cap 100000n
```

## Environment
- dreamdex-bot-kit 0.1.0 (docs/gotchas.md), viem 2.57.14, node v22.23.4, Linux
- Shannon testnet chain 50312 via https://dream-rpc.somnia.network (https://api.infra.testnet.somnia.network gives the same chain id 0xc488); read-only eth_call
