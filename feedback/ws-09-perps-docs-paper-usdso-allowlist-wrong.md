# Perps docs say 6 markets are blocked for paper USDso (voucher); on-chain allowlist and SDK allow all 21
Severity: major
Area: docs

## Steps to reproduce
1. `mkdir t && cd t && npm init -y >/dev/null && npm i viem @somnia-chain/markets-sdk@0.32.1`
2. Save `vo.mjs`:
```js
import { createPublicClient, http, parseAbi } from 'viem';
const c = createPublicClient({ transport: http('https://api.hideki2.infra.testnet.somnia.network') });
const MB = '0x478769E1177C0773c43A593DCCc4Ad15F15F1394';   // MarginBank
const abi = parseAbi(['function isVoucherMarketAllowed(address perpPool) view returns (bool)']);
// docs "Paper USDso = No" for ZRO, LIT, PUMP, VVV, ZEC, 1000PEPE ; BTC is "Yes"; last row is a negative control
const pools = { ZRO:'0x2a1822b02039ddf0e293f3f7243673fc03eaf16c', LIT:'0xdcb0ad226727b2ce92857f0af5751389d42b2a3f', PUMP:'0x76c981a52530cdf9497559140aafcd8cd16836e7', VVV:'0x352636ab146039851ef06d6367a106d5fb4e6409', ZEC:'0x2a73129f26917124bd2a47a9b355c395c537f050', '1000PEPE':'0xfa9b9e50cc1745113d57893991af200a74c86b6f', BTC:'0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0', control_random_addr:'0x0000000000000000000000000000000000000001' };
console.log(new Date().toISOString());
for (const [s, a] of Object.entries(pools)) { console.log(s.padEnd(20), 'isVoucherMarketAllowed =', await c.readContract({ address: MB, abi, functionName: 'isVoucherMarketAllowed', args: [a] })); await new Promise(r => setTimeout(r, 600)); }
```
3. `node vo.mjs` (run twice).
4. SDK check with a real voucher holder (read-only): save `vm.mjs`:
```js
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from '@somnia-chain/markets-sdk';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
import { createPublicClient, http, parseAbi } from 'viem';
const MB = '0x478769E1177C0773c43A593DCCc4Ad15F15F1394';
const acct = '0x3b12de7de9e111699ae87b04d2438d1466b9699c'; // an account with a voucher credit floor
const rpc = createPublicClient({ transport: http('https://api.hideki2.infra.testnet.somnia.network') });
console.log(new Date().toISOString(), 'getCreditFloor(acct) =', await rpc.readContract({ address: MB, abi: parseAbi(['function getCreditFloor(address) view returns (uint256)']), functionName: 'getCreditFloor', args: [acct] }));
const m = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: 'https://hideki-dev.smk.somnia.host/v1/graphql', addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES });
const perps = await m.client.listPerpMarkets();
for (const s of ['ZRO','LIT','PUMP','VVV','ZEC','1000PEPE','BTC']) {
  const p = perps.find(x => x.baseSymbol === s);
  const r = await m.client.getMaxPerpOrderSize({ pool: p.poolAddress, marginBank: p.marginBank, account: acct, isBid: true, price: BigInt(p.markPrice) });
  console.log(s.padEnd(9), 'placeable', r.placeable, 'limitedBy', r.limitedBy);
  await new Promise(r => setTimeout(r, 600));
}
process.exit(0);
```
   then `node vm.mjs`.

## Expected
Trading > Perps (Testnet) > Overview, "Paper USDso" column: **No** for 1000PEPE, LIT, PUMP, VVV, ZEC, ZRO (and Margin & Liquidations: "You can open or increase positions only in the markets marked Yes ... The six newest markets are not on that list"). The developer page says increasing a position in a market outside the allowlist reverts and `getMaxPerpOrderSize` reports `limitedBy: "voucherBlocked"`. The bot-kit `docs/perps.md` repeats "a voucher only trades on the markets it allows".

## Actual
`MarginBank.isVoucherMarketAllowed(pool)` returns `true` for all 21 perp pools (and `false` for a random address, so the call itself discriminates). For an account that actually carries a credit floor (3000 USDso), the SDK's `getMaxPerpOrderSize` reports `placeable: true` with `limitedBy: "initialMargin"` on the six "No" markets, never `voucherBlocked`. So either the docs table is stale (allowlist was opened up) or the allowlist is not configured as documented; either way users/bots are told not to trade 6 markets that the chain accepts.

## Evidence
```
2026-11-02T04:19:44.988Z
ZRO                  isVoucherMarketAllowed = true
LIT                  isVoucherMarketAllowed = true
PUMP                 isVoucherMarketAllowed = true
VVV                  isVoucherMarketAllowed = true
ZEC                  isVoucherMarketAllowed = true
1000PEPE             isVoucherMarketAllowed = true
BTC                  isVoucherMarketAllowed = true
control_random_addr  isVoucherMarketAllowed = false
(second run 2026-11-02T04:19:51.900Z: same values; also first read at 2026-11-02T04:14:53Z returned true for all 21 pools)

2026-11-02T04:21:37.984Z getCreditFloor(acct) = 3000000000000000000000n
ZRO       placeable true limitedBy initialMargin
LIT       placeable true limitedBy initialMargin
PUMP      placeable true limitedBy initialMargin
VVV       placeable true limitedBy initialMargin
ZEC       placeable true limitedBy initialMargin
1000PEPE  placeable true limitedBy initialMargin
BTC       placeable true limitedBy initialMargin
(same output on 2026-11-02T04:15:37Z)
```
No transaction was sent; actual on-chain rejection of a real voucher-funded order on these markets was not exercised (read-only constraint).

## Environment
Hideki testnet (chain 50383); wss://stg.api.dreamdex.io/v0/ws/public; node v22.23.4 with ws@8 and viem; run on 2026-11-02 (UTC).
