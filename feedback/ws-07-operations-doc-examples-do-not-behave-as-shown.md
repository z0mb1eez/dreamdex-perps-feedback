# WS Operations examples: getMarkets ignores `params.symbol`; getMarketSymbolOrder example id (ULID) returns 400 invalid_order_id, not order_not_found
Severity: normal
Area: docs

## Steps to reproduce
1. `mkdir t && cd t && npm init -y >/dev/null && npm i ws viem`
2. Save `gm.mjs`:
```js
import WebSocket from 'ws';
const ws = new WebSocket('wss://stg.api.dreamdex.io/v0/ws/public');
ws.on('open', () => ws.send(JSON.stringify({ id: 1, operation: 'getMarkets', params: { symbol: 'SOMI:USDso' } })));
ws.on('message', d => { const m = JSON.parse(d); console.log(new Date().toISOString(), 'status', m.status, 'markets returned:', m.payload.markets.map(x => x.symbol).sort().join(', ')); ws.close(); });
```
3. `node gm.mjs` (twice).
4. Save `probe.mjs` (same as in report 04) and run twice: `node probe.mjs '[{"id":2,"operation":"getMarketSymbolOrder","params":{"symbol":"SOMI:USDso","id":"01KC1F8N2NBP5GEYKE66CRJ34A"},"bearerToken":"x"}]'`

## Expected
- Operations > "getMarkets" example is sent WITH `"params": {"symbol": "SOMI:USDso"}` and the success example shows a `markets` array with only the SOMI:USDso entry, so the symbol filter is implied.
- Operations > "getMarketSymbolOrder" example uses order id `01KC1F8N2NBP5GEYKE66CRJ34A` and the error example shows `404 order_not_found` for it.

## Actual
- `getMarkets` ignores `params.symbol` and returns all three markets (SOMI:USDso, WBTC:USDso, WETH:USDso).
- The ULID order id from the docs is rejected as malformed: `400 invalid_order_id` ("invalid order ID: 01KC1F8N2NBP5GEYKE66CRJ34A"). Order ids on this API are decimal integers (e.g. `123` -> `404 order_not_found`, `590295810358731628132` -> `404 order_not_found`; `1:2` and ULIDs -> `400 invalid_order_id`). Nowhere in the WS docs is the id format described, and the other doc samples use ULID (`01KC...`) and hex (`0x1234...`) ids, neither of which is valid.

## Evidence
```
2026-11-02T04:19:18.412Z status 200 markets returned: SOMI:USDso, WBTC:USDso, WETH:USDso
2026-11-02T04:19:19.079Z status 200 markets returned: SOMI:USDso, WBTC:USDso, WETH:USDso
2026-11-02T04:19:08.093Z >> {"id":2,"operation":"getMarketSymbolOrder","params":{"symbol":"SOMI:USDso","id":"01KC1F8N2NBP5GEYKE66CRJ34A"},"bearerToken":"x"}
2026-11-02T04:19:08.180Z << {"id":2,"status":400,"errorName":"invalid_order_id","payload":{"description":"invalid order ID: 01KC1F8N2NBP5GEYKE66CRJ34A","name":"invalid_order_id","status":400}}
2026-11-02T04:19:11.692Z << {"id":2,"status":400,"errorName":"invalid_order_id",...}   (second run)
2026-11-02T04:12:31.442Z (symbol=SOMI:USDso,id="123") << {"id":1,"status":404,"errorName":"order_not_found","payload":{"description":"Order not found",...}}
```

## Environment
Hideki testnet (chain 50383); wss://stg.api.dreamdex.io/v0/ws/public; node v22.23.4 with ws@8 and viem; run on 2026-11-02 (UTC).
