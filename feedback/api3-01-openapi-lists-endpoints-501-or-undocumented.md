# OpenAPI spec advertises GET /v0/liquidations and /v0/markets/{symbol}/liquidations (live: 501 not_implemented) and endpoints that the HTTP API docs never mention
Severity: normal
Area: API

## Steps to reproduce
1. `curl -s https://api.dreamdex.io/.well-known/oapi.json` (also on `stg.api.dreamdex.io`; note: not under `/v0/`, see ccxt-05 where the CCXT source links the `/v0/.well-known/oapi.json` 404). It lists 62 operations.
2. `curl -s -i https://stg.api.dreamdex.io/v0/liquidations` and `.../v0/markets/SOMI:USDso/liquidations` (same on api.dreamdex.io).
3. Compare the spec's paths to the HTTP API pages (Overview, Market Data, Trading, Builder Fees, Vault, Wallets, Portfolio, Authentication, Error Handling): `GET /v0/trades/all`, `GET /v0/stop-orders`, `GET /v0/account/{wallet}/history`, `POST /v0/account/margin/{approve,deposit,withdraw}`, `/v0/referral*`, `/v0/liquidations` do not appear in any of them.

## Expected
Everything in the machine-readable spec is either implemented or flagged as such, and public endpoints that work are documented (or removed from the spec).

## Actual
- `GET /v0/liquidations` -> `501 {"description":"GetLiquidations is not yet implemented","name":"not_implemented","status":501}`; `GET /v0/markets/{symbol}/liquidations` -> `501 {"description":"GetMarketSymbolLiquidations is not yet implemented",...}`. The spec (used by SDK/CCXT generators) lists them with a normal 200 response, no "not implemented" marker.
- `GET /v0/trades/all` (public, no auth) works on both hosts (`?kind=spot|perp|all`, `symbols`, `since`, `limit` 1..1000, `cursor`, returns `{nextCursor, trades}`) but is not documented anywhere; it is the only way to page market-wide trades. It also silently skips unknown symbols (`?symbols=NOPE` -> `200 {"trades":[]}`) whereas the same unknown symbol returns `400 invalid_param` on `/v0/orderbooks` and `/v0/tickers` (see item 01), and `?since=abc` leaks a Go internal message (`error binding string parameter: strconv.ParseInt: parsing "abc": invalid syntax`).
- The spec's `Trade` schema has `maker`/`taker` properties; live responses (both hosts) never contain them.

## Evidence
2026-11-02T19:4x UTC:
```
GET /v0/liquidations            -> 501 {"description":"GetLiquidations is not yet implemented","name":"not_implemented","status":501}
GET /v0/trades/all?symbols=NOPE -> 200 {"trades":[]}
GET /v0/trades/all?since=abc    -> 400 ... strconv.ParseInt: parsing "abc": invalid syntax
GET /v0/trades/all?limit=2      -> 200 keys per trade: amount,cost,id,price,side,symbol,timestamp,txHash
```

## Environment
- Spot REST: https://stg.api.dreamdex.io/v0 (Shannon, 50312) and https://api.dreamdex.io/v0 (mainnet)
- Date: 2026-11-02 (UTC)
