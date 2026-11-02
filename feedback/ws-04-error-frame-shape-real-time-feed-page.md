# WS error frame: Real-Time Feed page documents channel "error" + message; live frame has no channel and adds errorName
Severity: normal
Area: docs

## Steps to reproduce
1. `mkdir t && cd t && npm init -y >/dev/null && npm i ws viem`
2. Save `probe.mjs`:
```js
import WebSocket from 'ws';
const msgs = JSON.parse(process.argv[2]);
const ws = new WebSocket('wss://stg.api.dreamdex.io/v0/ws/public');
ws.on('open', async () => { for (const m of msgs) { console.log(new Date().toISOString(), '>>', JSON.stringify(m)); ws.send(JSON.stringify(m)); await new Promise(r => setTimeout(r, 700)); } setTimeout(() => ws.close(), 1500); });
ws.on('message', d => console.log(new Date().toISOString(), '<<', String(d).slice(0, 600)));
```
3. Run twice: `node probe.mjs '[{"operation":"subscribe","channel":"foo","params":{}},{"operation":"subscribe","channel":"orderbook","params":{"symbols":["NOPE:USDso"]}},{"operation":"unsubscribe","channel":"orderbook","params":{"symbols":["WBTC:USDso"]}}]'`

## Expected
Real-Time Feed > Server Messages > `error:error`: fields `channel` (= "error", required), `type` (= "error"), `message`. The Errors page of the same API says the opposite: the envelope is flat with "no `channel` field", and adds `errorName`. A client written to the Real-Time Feed page (routing on `channel === "error"`) would never see these errors.

## Actual
Live frames match the Errors page, not the Real-Time Feed page: `{"type":"error","errorName":"...","message":"..."}`, with no `channel`. `errorName` is not in the `error:error` schema. In addition `subscription_failed` carries no reason or offending parameter: the generic text "subscription failed to channel: orderbook" is returned for an unknown symbol, a missing field, singular `symbol` instead of `symbols`, and an empty `symbols` array alike, although the page says "The message field contains a human-readable error description". The `not_subscribed` message does not say which channel/params failed.

## Evidence
```
2026-11-02T04:19:59.169Z >> {"operation":"subscribe","channel":"foo","params":{}}
2026-11-02T04:19:59.259Z << {"type":"error","errorName":"unknown_channel","message":"unknown channel: foo"}
2026-11-02T04:19:59.873Z >> {"operation":"subscribe","channel":"orderbook","params":{"symbols":["NOPE:USDso"]}}
2026-11-02T04:19:59.960Z << {"type":"error","errorName":"subscription_failed","message":"subscription failed to channel: orderbook"}
2026-11-02T04:20:00.575Z >> {"operation":"unsubscribe","channel":"orderbook","params":{"symbols":["WBTC:USDso"]}}
2026-11-02T04:20:00.662Z << {"type":"error","errorName":"not_subscribed","message":"not subscribed to channel"}
```
Identical on the earlier run at 2026-11-02T04:09:20Z-04:09:23Z. Also at 2026-11-02T04:17:11Z: `{"params":{"symbol":"WETH:USDso"}}` and `{"params":{"symbols":[]}}` both return the same generic `subscription_failed` text.

## Environment
Hideki testnet (chain 50383); wss://stg.api.dreamdex.io/v0/ws/public; node v22.23.4 with ws@8 and viem; run on 2026-11-02 (UTC).
