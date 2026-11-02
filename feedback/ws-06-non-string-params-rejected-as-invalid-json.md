# WS operations: numeric/boolean values in `params` are rejected as "invalid JSON request" and the error has no `id`
Severity: normal
Area: API

## Steps to reproduce
1. `mkdir t && cd t && npm init -y >/dev/null && npm i ws viem`
2. Save `probe.mjs` (same as in report 04).
3. Run twice: `node probe.mjs '[{"id":3,"operation":"getMarketSymbolTrades","params":{"symbol":"WBTC:USDso","limit":2}},{"id":4,"operation":"getMarketSymbolTrades","params":{"symbol":"WBTC:USDso","limit":"2"}}]'`

## Expected
Operations page: `params` is an "object - Path and query parameters as key-value pairs". `limit` is an integer query parameter in the HTTP API (`GET /v0/markets/{symbol}/trades?limit=2` works). The message is valid JSON, so a numeric `limit` should be accepted (or rejected with `invalid_parameters` and the request `id`, as the Errors page describes for invalid parameters).

## Actual
Any non-string value inside `params` (number, boolean) makes the server answer `{"type":"error","errorName":"invalid_request","message":"invalid JSON request"}` - the message is wrongly described as unparseable JSON, and the `id` is NOT echoed, so a client with several in-flight requests cannot tell which one failed. Passing the same value as a string (`"limit":"2"`) works. The requirement that every param be a string is not documented.

## Evidence
```
2026-11-02T04:18:58.912Z >> {"id":3,"operation":"getMarketSymbolTrades","params":{"symbol":"WBTC:USDso","limit":2}}
2026-11-02T04:18:59.002Z << {"type":"error","errorName":"invalid_request","message":"invalid JSON request"}
2026-11-02T04:18:59.614Z >> {"id":4,"operation":"getMarketSymbolTrades","params":{"symbol":"WBTC:USDso","limit":"2"}}
2026-11-02T04:18:59.710Z << {"id":4,"status":200,"payload":{"symbol":"WBTC:USDso","trades":[{"amount":"0.00018",...
--- second run
2026-11-02T04:19:03.866Z >> {"id":3,...,"limit":2}}
2026-11-02T04:19:03.957Z << {"type":"error","errorName":"invalid_request","message":"invalid JSON request"}
2026-11-02T04:19:04.667Z << {"id":4,"status":200,...
```
Also 04:16:57Z: `{"id":7,"operation":"getMarkets","params":{"x":true}}` -> same id-less invalid_request.

## Environment
Hideki testnet (chain 50383); wss://stg.api.dreamdex.io/v0/ws/public; node v22.23.4 with ws@8 and viem; run on 2026-11-02 (UTC).
