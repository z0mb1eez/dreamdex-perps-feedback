# x-ratelimit-* headers are absent on most 4xx errors and differ per route; limits are undocumented
Severity: normal
Area: API

## Steps to reproduce
1. `curl -s -i https://stg.api.dreamdex.io/v0/markets` (headers present)
2. `curl -s -i "https://stg.api.dreamdex.io/v0/markets/SOMI:USDso/candles"` (400 missing_field)
3. `curl -s -i https://stg.api.dreamdex.io/v0/orders` (401)
4. `curl -s -i https://stg.api.dreamdex.io/v0/auth/nonce`
5. `curl -s -i https://api.dreamdex.io/v0/currencies`

## Expected
Rate-limit headers are consistently present (or the docs explain which responses carry them), and the limits are documented so integrators can stay within them.

## Actual
The HTTP API docs never mention `x-ratelimit-limit/remaining/reset` or any limits. Observed: 200 responses and some errors (invalid_param on /tickers, market_not_found) carry them, but 400 missing_field (step 2), 400 invalid_param from OpenAPI parameter validation (e.g. limit=0), 401, 404 route and 405 do not, so clients lose their remaining budget on exactly the responses where they are likely to retry. Limits differ per route/environment: testnet /markets 100, testnet /auth/nonce 20, mainnet /currencies 200. `x-ratelimit-reset` is a Unix timestamp in seconds, which is also undocumented.

## Evidence
2026-11-02T04:05:55Z - 04:06:57Z:
```
GET /v0/markets (stg)        -> 200, x-ratelimit-limit: 100, remaining: 99, reset: 1793592356
GET /v0/auth/nonce (stg)     -> 200, x-ratelimit-limit: 20
GET /v0/currencies (mainnet) -> 200, x-ratelimit-limit: 200
GET /v0/markets/SOMI:USDso/candles -> 400 missing_field, NO x-ratelimit headers
GET /v0/markets/SOMI:USDso/trades?limit=0 -> 400 invalid_param, NO x-ratelimit headers
GET /v0/orders -> 401, NO x-ratelimit headers
GET /v0/markets/SOM:USD/trades -> 404 market_not_found, x-ratelimit-limit: 100 present
```

## Environment
- Network: Somnia testnet (Shannon, chain 50312, spot REST staging API); this is the only HTTP API base the docs list, no perps HTTP base is documented
- Date: 2026-11-02 (UTC)
- Base URL: https://stg.api.dreamdex.io/v0
