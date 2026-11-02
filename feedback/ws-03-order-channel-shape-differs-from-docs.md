# WS `order` channel: no `order:snapshot`, events use a different schema (raw units, `event` field), docs example subscribe fails
Severity: major
Area: API

## Steps to reproduce
1. `mkdir t && cd t && npm init -y >/dev/null && npm i ws viem`
2. Save as `order.mjs` (takes the most recent REST trade; its id is `<makerOrTakerOrderId>:<otherOrderId>`, both are order ids of recently executed orders):
```js
import WebSocket from 'ws';
const r = await (await fetch('https://stg.api.dreamdex.io/v0/markets/WBTC:USDso/trades?limit=1')).json();
const [a, b] = r.trades[0].id.split(':');
console.log(new Date().toISOString(), 'latest REST trade', JSON.stringify(r.trades[0]));
const ws = new WebSocket('wss://stg.api.dreamdex.io/v0/ws/public');
ws.on('open', async () => { for (const orderId of [a, b]) {
  const m = { operation: 'subscribe', channel: 'order', params: { symbol: 'WBTC:USDso', orderId } };
  console.log(new Date().toISOString(), '>>', JSON.stringify(m)); ws.send(JSON.stringify(m)); await new Promise(r => setTimeout(r, 800)); }
  setTimeout(() => ws.close(), 1500); });
ws.on('message', d => console.log(new Date().toISOString(), '<<', String(d)));
```
3. `node order.mjs` (run twice; use it within a minute or two of a trade, see note in Actual).
4. Also try the exact docs example from Real-Time Feed > "Subscribe to order updates": `{"operation":"subscribe","channel":"order","params":{"orderId":"0x1234567890abcdef"}}` and the same with `"symbol":"WBTC:USDso"` added.

## Expected
Per the Real-Time Feed docs: after `subscribed` the server sends an `order:snapshot` with an `order` object (`id`, `market`, `side`, decimal-string `price`/`quantity`/`filled`, `status` in open/partial/filled/cancelled, `createdAt`, `updatedAt`), then `order:update` messages carrying the same full `order` object. The "Order Lifecycle Tracking" steps tell you to wait for `order.status` of `filled`/`cancelled`. orderId is shown as hex (`0x...`) and the docs' subscribe example has no `symbol`.

## Actual
- No `order:snapshot` is ever sent. Instead the server replays a few past events as `type:"update"` messages with a completely different shape: `{channel,type:"update",orderId,event,timestamp,block,...}` where `event` is one of `placed`, `rested`, `filled`, `cancelled` (not the documented `status`). There is no `order` object, no `status`, no `filled` total, no `market`, no `side` (only `isBid` on `placed`), no `createdAt/updatedAt`.
- `price` and `quantity` are raw chain units, not decimal strings (price `78653600000000000000000` = 78653.6 with 18 decimals; quantity `11000` = 0.00011 WBTC with 8 decimals). `filled` events carry the per-fill `quantity`, not a cumulative amount.
- Events are not delivered in chronological order on subscribe (`filled` arrives before `placed`).
- `orderId` must be the decimal uint (e.g. `590295810358731628543`); the docs' hex `0x...` form (with or without `symbol`) returns `subscription_failed`. Omitting `symbol` (as in the docs' example request) also returns `subscription_failed`, so the docs example cannot work as written.
- An id that does not exist is still accepted: `orderId:"123"` returns `subscribed` and nothing else (no snapshot, no error), so a typo is indistinguishable from an idle order.
- Replay only covers a short recent window: the same order id that replayed `filled`/`placed` at 04:12:54Z replayed nothing at 04:18:28Z, so a late subscriber gets no state at all (this is why the docs promise a snapshot).

## Evidence
```
2026-11-02T04:18:42.026Z latest REST trade {"amount":"0.00011","cost":"8.651896","id":"590295810358731628543:774763251095827144696","price":"78653.6","side":"buy",...}
2026-11-02T04:18:42.419Z >> {"operation":"subscribe","channel":"order","params":{"symbol":"WBTC:USDso","orderId":"590295810358731628543"}}
2026-11-02T04:18:42.509Z << {"channel":"order","type":"subscribed","symbol":"WBTC:USDso","orderId":"590295810358731628543"}
2026-11-02T04:18:42.509Z << {"channel":"order","type":"update","orderId":"590295810358731628543","event":"filled","timestamp":1793593115708,"block":530187636,"quantity":"11000"}
2026-11-02T04:18:42.510Z << {"channel":"order","type":"update","orderId":"590295810358731628543","event":"placed","timestamp":1793593115708,"block":530187636,"isBid":true,"price":"78653600000000000000000","quantity":"11000","remaining":"0","expiresAt":18446744073709}
2026-11-02T04:18:43.221Z >> {... "orderId":"774763251095827144696"}
2026-11-02T04:18:43.592Z << {"channel":"order","type":"update","orderId":"774763251095827144696","event":"placed","timestamp":1793593113008,"block":530187609,"isBid":false,"price":"78653600000000000000000","quantity":"135000","remaining":"135000","expiresAt":1793593143000}
2026-11-02T04:18:43.592Z << {... "event":"rested" ...}
2026-11-02T04:18:43.593Z << {... "event":"filled","timestamp":1793593115708,"block":530187636,"quantity":"11000"}
--- second run
2026-11-02T04:18:47.510Z << {"channel":"order","type":"update","orderId":"92233720368573734903","event":"filled","timestamp":1793593125708,"block":530187736,"quantity":"15000"}
2026-11-02T04:18:49.621Z << {"channel":"order","type":"update","orderId":"92233720368573734903","event":"cancelled","timestamp":1793593129408,"block":530187773}
--- docs example requests
2026-11-02T04:18:26.573Z >> {"operation":"subscribe","channel":"order","params":{"orderId":"0x1234567890abcdef"}}
2026-11-02T04:18:26.664Z << {"type":"error","errorName":"subscription_failed","message":"subscription failed to channel: order"}
2026-11-02T04:18:27.277Z >> {"operation":"subscribe","channel":"order","params":{"symbol":"WBTC:USDso","orderId":"0x1234567890abcdef"}}
2026-11-02T04:18:27.365Z << {"type":"error","errorName":"subscription_failed","message":"subscription failed to channel: order"}
2026-11-02T04:18:28.768Z << {"channel":"order","type":"subscribed","symbol":"WBTC:USDso","orderId":"123"}
```

## Environment
Hideki testnet (chain 50383); wss://stg.api.dreamdex.io/v0/ws/public; node v22.23.4 with ws@8; run on 2026-11-02 (UTC).
