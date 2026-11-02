# WS trades:snapshot returns only ~3 min of trades; `limit` (default 100) is not honoured
Severity: normal
Area: API

## Steps to reproduce
1. `mkdir t && cd t && npm init -y >/dev/null && npm i ws viem`
2. Save as `trades2.mjs`:
```js
import WebSocket from 'ws';
const limit = process.argv[2] ? Number(process.argv[2]) : undefined;
const ws = new WebSocket('wss://stg.api.dreamdex.io/v0/ws/public');
ws.on('open', () => ws.send(JSON.stringify({ operation: 'subscribe', channel: 'trades', params: { symbols: ['WBTC:USDso'], ...(limit && { limit }) } })));
ws.on('message', async d => {
  const m = JSON.parse(d); if (m.type !== 'snapshot') return;
  const t = m.trades.map(x => x.timestamp);
  console.log(new Date().toISOString(), 'WS limit', limit ?? '(default)', 'count', t.length, 'span', new Date(Math.min(...t)).toISOString(), '->', new Date(Math.max(...t)).toISOString());
  const r = await (await fetch('https://stg.api.dreamdex.io/v0/markets/WBTC:USDso/trades?limit=' + (limit ?? 100))).json();
  console.log('REST /trades?limit=' + (limit ?? 100), 'count', r.trades.length);
  ws.close();
});
```
3. `node trades2.mjs; node trades2.mjs 100; node trades2.mjs 10` (repeat once).

## Expected
Docs: "Contains the most recent trades up to the requested limit (default 100)." With ample history (REST returns the full 100 / 10), the snapshot should hold 100 (default), 100 and 10 trades respectively.

## Actual
The snapshot holds only the last ~2-3 minutes of trades (about 17-18 for WBTC:USDso, which trades every ~10s), whatever the market history. Setting `limit` makes it shrink further instead of capping: limit=10 returned 3-5 trades, limit=2 returned 1, limit=5 returned 1, limit=50 returned 17. Values 0/-1/1000 are silently accepted.

## Evidence
```
2026-11-02T04:18:15.647Z WS limit (default) count 17 span 04:15:25.665Z -> 04:18:05.708Z
REST /trades?limit=100 count 100 (oldest 2026-11-02T04:01:05.914Z)
2026-11-02T04:18:16.558Z WS limit 100 count 18 span 04:15:25.665Z -> 04:18:15.708Z
2026-11-02T04:18:17.447Z WS limit 10 count 5   | REST limit=10 count 10
2026-11-02T04:18:20.841Z WS limit 10 count 3   | REST limit=10 count 10
```
Earlier run, same day: 04:11:45Z limit=3 -> 1 trade, limit=10 -> 4, limit=16 -> 8, limit=18 -> 7, limit=50 -> 17.

## Environment
Hideki testnet (chain 50383); wss://stg.api.dreamdex.io/v0/ws/public; node v22.23.4 with ws@8; run on 2026-11-02 (UTC).
