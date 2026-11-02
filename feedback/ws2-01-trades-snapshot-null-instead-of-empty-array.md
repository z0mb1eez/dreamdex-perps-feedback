# WS `trades` snapshot returns `"trades": null` (not an array) when the market has no trade in its window
Severity: normal
Area: API

## Steps to reproduce
1. `cd $(mktemp -d) && cat > t.mjs <<'JS'
const ws = new WebSocket('wss://api.dreamdex.io/v0/ws/public');
ws.onopen = () => ws.send(JSON.stringify({operation:'subscribe',channel:'trades',params:{symbols:['SOMI:USDso'],limit:100}}));
ws.onmessage = m => console.log(String(m.data).slice(0,200));
setTimeout(()=>process.exit(0), 15000);
JS
node t.mjs` (Node 22; no dependencies)
2. Run it while the market is quiet (mainnet SOMI:USDso had no trade for tens of minutes on 2026-11-02; `GET /v0/markets/SOMI:USDso/trades?limit=1` shows the last trade older than the snapshot window).

## Expected
WS docs, `trades:snapshot`: `trades | array<object> | required` ("Contains the most recent trades up to the requested limit (default 100)"). An empty window should give `[]`.

## Actual
```
{"channel":"trades","type":"subscribed","symbols":["SOMI:USDso"]}
{"channel":"trades","type":"snapshot","symbol":"SOMI:USDso","trades":null}
```
`trades` is JSON `null` although REST has older trades (see ws-02: the snapshot only covers a short window and ignores `limit`). Clients typed against the documented schema (`snapshot.trades.map(...)`, `for t of snapshot.trades`) throw `TypeError` on quiet markets. The same subscription on the testnet host (`stg.api.dreamdex.io`, busy synthetic market) returns an array. Related effect: CCXT's `watchTrades('SOMI/USDSO')` on a quiet market resolves nothing for 70+ seconds because the snapshot is empty/null and no update arrives.

## Evidence
2026-11-02T19:4x UTC, output above (mainnet host); testnet host returned `"trades":[{"id":"1793647969215-0",...}]` with 10 s-spaced synthetic trades.

## Environment
- WS: wss://api.dreamdex.io/v0/ws/public (mainnet) and wss://stg.api.dreamdex.io/v0/ws/public
- Date: 2026-11-02 (UTC)
