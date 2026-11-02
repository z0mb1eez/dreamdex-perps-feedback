# SDK docs and chain definition say Hideki blocks land every 10 ms; measured block time is 100 ms
Severity: normal
Area: docs

## Steps to reproduce
1. `mkdir t && cd t && npm init -y >/dev/null && npm pkg set type=module && npm i viem @somnia-chain/markets-sdk@0.32.1`
2. Save `bt.mjs`:
```js
import { createPublicClient, http } from 'viem';
import { hidekiTestnet, somniaShannon } from '@somnia-chain/markets-sdk/chains';
console.log('SDK hidekiTestnet.blockTime', hidekiTestnet.blockTime, '| somniaShannon.blockTime', somniaShannon.blockTime);
for (const [n, u] of [['shannon', 'https://api.infra.testnet.somnia.network'], ['hideki', 'https://api.hideki2.infra.testnet.somnia.network']]) {
  const c = createPublicClient({ transport: http(u) });
  const h = await c.getBlockNumber();
  const b1 = await c.getBlock({ blockNumber: h - 1000n }), b2 = await c.getBlock({ blockNumber: h });
  console.log(n, 'seconds spanned by 1000 blocks:', Number(b2.timestamp - b1.timestamp));
}
const c = createPublicClient({ transport: http('https://api.hideki2.infra.testnet.somnia.network') });
const a = await c.getBlockNumber(), t0 = Date.now();
await new Promise(r => setTimeout(r, 10000));
const b = await c.getBlockNumber();
console.log('hideki wall-clock: blocks in', Date.now() - t0, 'ms =', b - a, '-> ms/block', ((Date.now() - t0) / Number(b - a)).toFixed(1));
```
3. `node bt.mjs`

## Expected
`docs/reference/networks-and-endpoints.md` table: `hidekiTestnet | 50383 | ... | Block time 10 ms`. `docs/CHAINS.md` and `docs/CHAINS_WALKTHROUGH.md` also say **10 ms**; `docs/BRIDGE.md` says "Hideki is a ~10 ms-block network"; `src/chains/definitions/hidekiTestnet.ts` says "blocks land every **10 ms** (~100 blocks/s) instead of Shannon's 100 ms" and sets `blockTime: 10`.

## Actual
Hideki produces a block every 100 ms (about 10 blocks/s), identical to Shannon: 1000 blocks span 100 s on both chains, and a 10 s wall-clock sample shows 105 blocks. The `blockTime: 10` value is also what viem uses to size polling and wait intervals (per the comment in the chain definition), so downstream latency tuning built on the 10 ms claim is off by 10x.

## Evidence
2026-11-02 ~09:12 UTC:
```
SDK hidekiTestnet.blockTime 10 | somniaShannon.blockTime 100
shannon seconds spanned by 1000 blocks: 100
hideki seconds spanned by 1000 blocks: 100
hideki wall-clock: blocks in 10514 ms = 105 -> ms/block 100.1
```

## Environment
- @somnia-chain/markets-sdk 0.32.1, viem 2.57.14, node v22.23.4, Linux
- Hideki testnet chain 50383 (https://api.hideki2.infra.testnet.somnia.network, eth_chainId 0xc4cf); read-only
