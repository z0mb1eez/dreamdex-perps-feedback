# Perps docs "Open interest cap" column (and "account cap = a tenth of it") does not match live pool parameters on 20 of 21 markets
Severity: normal
Area: docs

## Steps to reproduce
1. `mkdir t && cd t && npm init -y >/dev/null && npm i viem`
2. Save `oi.mjs` (reads `getPerpPoolParameters()` straight from each pool; pool addresses are the `poolAddress` of each market from the indexer / SDK `listPerpMarkets()`):
```js
import { createPublicClient, http, parseAbi, formatUnits } from 'viem';
const c = createPublicClient({ transport: http('https://api.hideki2.infra.testnet.somnia.network') });
const abi = parseAbi(['function getPerpPoolParameters() view returns ((uint256 initialMarginBps, uint256 maintenanceMarginBps, uint256 closeOutMarginBps, uint256 maxOpenInterest, uint256 maxPositionSize, uint256 takerFeeBpsTimes1k, int256 makerFeeBpsTimes1k, uint256 insuranceFundShareBps))']);
// [symbol, pool, baseDecimals, value in docs table "Open interest cap"]
const rows = [
 ['BTC','0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0',8,246.81545],
 ['ETH','0xd6cb1dd58580b84d76068ac21594219ce03aeddf',18,3995.6125],
 ['XRP','0x7058579f3248559963f79adb937c6de9f953e060',6,344632],
 ['TAO','0xd9b6a347a3ae9fd6ba21179d3343f2c8a922f697',9,2185.491],
 ['ZEC','0x2a73129f26917124bd2a47a9b355c395c537f050',8,420]];
console.log(new Date().toISOString());
for (const [s, pool, dec, doc] of rows) {
  const p = await c.readContract({ address: pool, abi, functionName: 'getPerpPoolParameters' });
  const oi = +formatUnits(p.maxOpenInterest, dec), pos = +formatUnits(p.maxPositionSize, dec);
  console.log(s, 'docs cap', doc, '| on-chain maxOpenInterest', oi, '| maxPositionSize', pos, '| maxPosition/maxOI', (pos / oi).toFixed(3));
  await new Promise(r => setTimeout(r, 600));
}
```
3. `node oi.mjs` (run twice).
4. Optional history (shows when the on-chain value changed): GraphQL `{ PerpPoolParametersEpoch(where:{pool:{_eq:"0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0"}},order_by:{timestamp:asc}){ timestamp maxOpenInterest maxPositionSize } }` at https://hideki-dev.smk.somnia.host/v1/graphql

## Expected
Trading > Perps (Testnet) > Overview says the market table figures "are read from the live markets", with an "Open interest cap" per market, and "A single account is capped at a tenth of it on most markets." (Developer page repeats: "a tenth of the market's open interest cap on most markets".)

## Actual
The table's "Open interest cap" equals the value the pools had before they were raised on 2026-10-19/20 (BTC: genesis value; ZEC: its 2026-10-13 value), so it is stale against the live pools. Live `maxOpenInterest` vs docs: BTC 493.6309 (docs 246.81545, 2x), ETH 7991.225 (docs 3995.6125, 2x), HYPE and SOL 2x, XRP and the 10x/5x markets 4x (e.g. ZEC 1680 vs 420, ZRO 1,002,398 vs 250,599.5); only TAO matches. The real open interest of BTC (328.16 BTC) and XRP (1,048,564.6 XRP) is already above the documented cap (246.8 BTC, 344,632 XRP), so the documented cap cannot be right. The per-account cap (`maxPositionSize`) is only a tenth of the cap on 1 of 21 markets (TAO): it is 1/40 on ZRO, LIT, VVV, 1000PEPE, PUMP and WLD, 1/20 on ETH, XRP, HYPE, SOL and the 10x markets, 1/5 on BTC (100 BTC), and for ZEC (420) it equals the doc's "cap" value. So "a tenth ... on most markets" is not true either.

## Evidence
```
2026-11-02T04:19:35.828Z
BTC docs cap 246.81545 | on-chain maxOpenInterest 493.6309 | maxPositionSize 100 | maxPosition/maxOI 0.203
ETH docs cap 3995.6125 | on-chain maxOpenInterest 7991.225 | maxPositionSize 399.5612 | maxPosition/maxOI 0.050
XRP docs cap 344632 | on-chain maxOpenInterest 1378528 | maxPositionSize 68926.4 | maxPosition/maxOI 0.050
TAO docs cap 2185.491 | on-chain maxOpenInterest 2185.491 | maxPositionSize 218.549 | maxPosition/maxOI 0.100
ZEC docs cap 420 | on-chain maxOpenInterest 1680 | maxPositionSize 420 | maxPosition/maxOI 0.250
```
(identical on a second run at 2026-11-02T04:19:4xZ, and independently via the indexer `PerpPoolParametersEpoch` at 04:13:49Z).
Indexer history for BTC: genesis 2026-09-17 OI 246.81545; 2026-10-19T23:23:03Z 275; 2026-10-20T06:44:15Z 277.75; 2026-10-20T08:07:35Z 319.4125; 2026-10-20T08:43:19Z 493.6309 (pos cap 100 since 2026-10-19T08:53:26Z). ZEC: 425.488 genesis, 420 on 2026-10-13, 1680 on 2026-10-20T11:37:42Z.
Current open interest (SDK `listPerpMarkets().openInterest`, 04:13:26Z): BTC 328.16086, XRP 1048564.6, ADA 341970 (doc cap 2,254,678 fine), ZRO 30724.5.
Everything else in the table checked out against live pools: max leverage / initial and maintenance margin (IM 500/1000/2000 bps, MM = IM/2), tick, min size, base decimals, 0 maker/taker fee, 8h funding window with 1h interval, 1% liquidation penalty (LiquidationEngine.getLiquidationPenaltyBps = 100), 14-day voucher expiry (1209600 s) and 1000 USDso grant.

## Environment
Hideki testnet (chain 50383); wss://stg.api.dreamdex.io/v0/ws/public; node v22.23.4 with ws@8 and viem; run on 2026-11-02 (UTC).
