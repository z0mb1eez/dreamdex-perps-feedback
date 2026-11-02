# Unrouted paths and wrong methods return text/plain, contradicting "all error responses use a consistent JSON format"
Severity: normal
Area: docs

## Steps to reproduce
1. `curl -s -i https://stg.api.dreamdex.io/markets`
2. `curl -s -i https://stg.api.dreamdex.io/v0/markets/SOMI:USDso/orderbook`
3. `curl -s -i -X POST https://stg.api.dreamdex.io/v0/auth/nonce`
4. `curl -s -i https://stg.api.dreamdex.io/v0/auth/login`

## Expected
Error Handling page: "All error responses use a consistent JSON format" with `status`, `name`, `description`, and an `Error-Name` header. 404/405 are described (omitting /v0 "returns a 404"; the per-market orderbook path "404").

## Actual
Steps 1 and 2 return 404 with `content-type: text/plain` and body `404 page not found`. Steps 3 and 4 return 405 with `text/plain` body `Method Not Allowed`. No JSON, no `error-name` header. A client that always parses JSON errors will throw a parse error. Also, there is no documented `method_not_allowed`/route-not-found name in the error table.

## Evidence
2026-11-02T04:06:43Z, repeated 04:07:20Z:
```
GET /markets            -> HTTP/2 404, content-type: text/plain; charset=utf-8, body: 404 page not found
GET /v0/markets/SOMI:USDso/orderbook -> HTTP/2 404, text/plain, 404 page not found
POST /v0/auth/nonce     -> HTTP/2 405, allow: GET, HEAD, text/plain, Method Not Allowed
GET /v0/auth/login      -> HTTP/2 405, allow: POST, text/plain, Method Not Allowed
```
For contrast, an unknown market gives JSON: `{"description":"market not found: SOM:USD","name":"market_not_found","status":404}`.

## Environment
- Network: Somnia testnet (Shannon, chain 50312, spot REST staging API); this is the only HTTP API base the docs list, no perps HTTP base is documented
- Date: 2026-11-02 (UTC)
- Base URL: https://stg.api.dreamdex.io/v0
