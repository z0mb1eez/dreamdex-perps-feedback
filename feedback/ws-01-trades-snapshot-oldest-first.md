# WS trades:snapshot is ordered oldest-first, docs say newest-first
Severity: normal
Area: docs

## Steps to reproduce
1. `mkdir t && cd t && npm init -y >/dev/null && npm i ws viem`
2. Save as `trades.mjs`:
```js
import WebSocket from 'ws';
const ws = new WebSocket('wss://stg.api.dreamdex.io/v0/ws/public');
ws.on('open', () => ws.send(JSON.stringify({ operation: 'subscribe', channel: 'trades', params: { symbols: ['WBTC:USDso'] } })));
ws.on('message', d => {
  const m = JSON.parse(d); if (m.type !== 'snapshot') return;
  const t = m.trades.map(x => x.timestamp);
  console.log(new Date().toISOString(), 'count', t.length, 'first', new Date(t[0]).toISOString(), 'last', new Date(t.at(-1)).toISOString(),
    'newestFirst', t.every((x, i) => !i || t[i-1] >= x), 'oldestFirst', t.every((x, i) => !i || t[i-1] <= x));
  ws.close();
});
```
3. `node trades.mjs` (run it twice).

## Expected
Docs (Real-Time Feed, `trades:snapshot`): "Trades are ordered by timestamp descending (newest first)." The docs example also lists trade001 (ts ...169000) before trade002 (ts ...168000), i.e. descending.

## Actual
`trades[]` in the snapshot is in ascending timestamp order (oldest first, newest last). A client that follows the docs and takes `trades[0]` as the latest trade gets the oldest one in the window.

## Evidence
```
2026-11-02T04:18:15.647Z count 17 first 2026-11-02T04:15:25.665Z last 2026-11-02T04:18:05.708Z newestFirst false oldestFirst true
2026-11-02T04:18:18.578Z count 18 first 2026-11-02T04:15:25.665Z last 2026-11-02T04:18:15.708Z newestFirst false oldestFirst true
```
Same result on 2026-11-02T04:10:32Z and 04:12:00Z runs (SOMI:USDso also oldest-first, 04:11:37Z).

## Environment
Hideki testnet (chain 50383); wss://stg.api.dreamdex.io/v0/ws/public; node v22.23.4 with ws@8; run on 2026-11-02 (UTC).
