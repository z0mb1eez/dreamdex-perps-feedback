# GET /v0/portfolio without a token returns 400 missing_field instead of 401 unauthorized
Severity: normal
Area: API

## Steps to reproduce
1. `curl -s -i https://stg.api.dreamdex.io/v0/portfolio`
2. `curl -s -i "https://stg.api.dreamdex.io/v0/portfolio?timeframe=1d"`
3. For comparison: `curl -s -i https://stg.api.dreamdex.io/v0/orders`

## Expected
Docs: private endpoints return `unauthorized` (401) when the bearer token is missing; the portfolio wallet "is taken from the bearer token". Behaviour should be consistent across private endpoints.

## Actual
Without a token, /v0/portfolio returns 400 `missing_field` ("Query argument timeframe is required") because parameter validation runs before authentication; only after adding `timeframe` does it return 401. /v0/orders and /v0/markets/{symbol}/trades/mine return 401 straight away. The required `timeframe` parameter and its allowed values are also not stated in prose on the Portfolio page, so a client that follows the docs sees a confusing 400 rather than an auth error.

## Evidence
2026-11-02T04:06:46Z, repeated 04:07 UTC:
```
GET /v0/portfolio                  -> HTTP/2 400 {"description":"Query argument timeframe is required, but not found","name":"missing_field","status":400}
GET /v0/portfolio?timeframe=1d     -> HTTP/2 401 {"description":"authentication required","name":"unauthorized","status":401}
GET /v0/orders                     -> HTTP/2 401 {"description":"authentication required","name":"unauthorized","status":401}
```

## Environment
- Network: Somnia testnet (Shannon, chain 50312, spot REST staging API); this is the only HTTP API base the docs list, no perps HTTP base is documented
- Date: 2026-11-02 (UTC)
- Base URL: https://stg.api.dreamdex.io/v0
