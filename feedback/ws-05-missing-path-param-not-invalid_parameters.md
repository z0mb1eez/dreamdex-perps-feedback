# WS operations: missing required path param returns a 404/400 domain error, not the documented invalid_parameters protocol error
Severity: normal
Area: API

## Steps to reproduce
1. `mkdir t && cd t && npm init -y >/dev/null && npm i ws viem`
2. Save `probe.mjs` (same as in report 04: opens wss://stg.api.dreamdex.io/v0/ws/public, sends each JSON message in argv[2] 700 ms apart, prints every reply with a UTC timestamp).
3. Run twice: `node probe.mjs '[{"id":1,"operation":"getMarketSymbolOrder","params":{"id":"123"}},{"id":2,"operation":"getMarketSymbolTrades"}]'`

## Expected
Errors page: `invalid_parameters` - "Missing/invalid path or query parameters", example message `"missing required path parameter: symbol"`, delivered as a protocol error `{"type":"error","errorName":"invalid_parameters","message":...,"id":N}`.

## Actual
The missing `symbol` is substituted with an empty string and the request is routed to the HTTP handler, which answers with a regular response `status:404 errorName:"market_not_found"` ("market not found: " with an empty name). With `getMarketSymbolOrder` and no params at all, the reply is `400 invalid_order_id` ("invalid order ID: "). `invalid_parameters` was never observed for any input. A client following the docs and handling `invalid_parameters` for bad calls will not match.

## Evidence
```
2026-11-02T04:18:57.508Z >> {"id":1,"operation":"getMarketSymbolOrder","params":{"id":"123"}}
2026-11-02T04:18:57.598Z << {"id":1,"status":404,"errorName":"market_not_found","payload":{"description":"market not found: ","name":"market_not_found","status":404}}
2026-11-02T04:18:58.211Z >> {"id":2,"operation":"getMarketSymbolTrades"}
2026-11-02T04:18:58.300Z << {"id":2,"status":404,"errorName":"market_not_found","payload":{"description":"market not found: ","name":"market_not_found","status":404}}
--- second run
2026-11-02T04:19:02.554Z << {"id":1,"status":404,"errorName":"market_not_found",...}
2026-11-02T04:19:03.255Z << {"id":2,"status":404,"errorName":"market_not_found",...}
--- earlier (04:12:15Z / 04:09:19Z): {"id":6,"operation":"getMarketSymbolOrder"} -> {"id":6,"status":400,"errorName":"invalid_order_id","payload":{"description":"invalid order ID: ",...}}
```

## Environment
Hideki testnet (chain 50383); wss://stg.api.dreamdex.io/v0/ws/public; node v22.23.4 with ws@8 and viem; run on 2026-11-02 (UTC).
