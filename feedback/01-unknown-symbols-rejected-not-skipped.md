# Unknown symbols return 400 invalid_param instead of being silently skipped (/v0/orderbooks, /v0/tickers)
Severity: major
Area: docs

## Steps to reproduce
1. `curl -s -i "https://stg.api.dreamdex.io/v0/orderbooks?symbols=SOMI:USDso,WETH:USDso"`
2. `curl -s -i "https://stg.api.dreamdex.io/v0/tickers?symbols=NOPE:USDso"`
3. `curl -s -i "https://stg.api.dreamdex.io/v0/orderbooks?symbols=SOMI:USDso&symbols=NOPE:USDso"`

## Expected
Docs (Market Data page) say: "Unknown or malformed symbols are silently skipped rather than erroring, so a serialization mismatch shows up as an empty `[]` rather than a 4xx", and for /v0/tickers "unknown symbols are silently skipped". The comma-separated example is documented as returning `[]`.

## Actual
All three return HTTP 400 `invalid_param` with a `context.invalid_symbols` list. In step 3 the valid symbol's data is also withheld. No response is `[]`. (The error body also carries an undocumented `context` field.)

## Evidence
Request 2026-11-02T04:06:21Z and again 04:07:20Z:
```
GET /v0/orderbooks?symbols=SOMI:USDso,WETH:USDso
HTTP/2 400
error-name: invalid_param
{"context":{"invalid_symbols":["SOMI:USDso,WETH:USDso"]},"description":"unknown market symbols: SOMI:USDso,WETH:USDso","name":"invalid_param","status":400}

GET /v0/tickers?symbols=NOPE:USDso
HTTP/2 400
{"context":{"invalid_symbols":["NOPE:USDso"]},"description":"unknown market symbols: NOPE:USDso","name":"invalid_param","status":400}

GET /v0/orderbooks?symbols=SOMI:USDso&symbols=NOPE:USDso
HTTP/2 400
{"context":{"invalid_symbols":["NOPE:USDso"]},"description":"unknown market symbols: NOPE:USDso","name":"invalid_param","status":400}
```
The same "silently skipped" claim is made for GET /v0/orders (symbols); that one requires auth so was not tested.

## Environment
- Network: Somnia testnet (Shannon, chain 50312, spot REST staging API); this is the only HTTP API base the docs list, no perps HTTP base is documented
- Date: 2026-11-02 (UTC)
- Base URL: https://stg.api.dreamdex.io/v0
