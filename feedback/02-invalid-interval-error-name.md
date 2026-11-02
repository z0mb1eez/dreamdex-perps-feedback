# Bad candle interval returns invalid_param, not documented invalid_interval
Severity: normal
Area: docs

## Steps to reproduce
1. `curl -s -i "https://stg.api.dreamdex.io/v0/markets/SOMI:USDso/candles?interval=2h"`
2. `curl -s -i "https://stg.api.dreamdex.io/v0/markets/WETH:USDso/candles?interval="`

## Expected
Error Handling page lists `invalid_interval` (400): "Unsupported candle interval". The `name` field and `Error-Name` header are described as stable and intended for programmatic handling.

## Actual
HTTP 400 with name `invalid_param` and header `error-name: invalid_param`. A client branching on `invalid_interval` never matches. The `description` also embeds a multi-line JSON-schema dump. The allowed values (1m, 5m, 15m, 1h, 4h, 1d) are only discoverable from this error text. Same pattern: `limit=0` or `limit=1001` returns `invalid_param` rather than a more specific documented name (no documented limit bounds either: actual min 1, max 1000, default 100, on both /trades and /candles).

## Evidence
2026-11-02T04:06:35Z and 04:07:18Z:
```
GET /v0/markets/SOMI:USDso/candles?interval=2h
HTTP/2 400
error-name: invalid_param
{"description":"parameter \"interval\" in query has an error: value is not one of the allowed values [\"1m\",\"5m\",\"15m\",\"1h\",\"4h\",\"1d\"]\nSchema:\n  {\n    \"enum\": [...],\n    \"type\": \"string\"\n  }\n\nValue:\n  \"2h\"\n","name":"invalid_param","status":400}
```

## Environment
- Network: Somnia testnet (Shannon, chain 50312, spot REST staging API); this is the only HTTP API base the docs list, no perps HTTP base is documented
- Date: 2026-11-02 (UTC)
- Base URL: https://stg.api.dreamdex.io/v0
