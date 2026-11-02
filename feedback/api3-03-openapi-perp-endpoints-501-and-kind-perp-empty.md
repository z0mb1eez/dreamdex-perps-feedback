# OpenAPI perp operations (funding, open-interest) return 501 on both REST hosts, and `kind=perp|all` returns no perp markets
Severity: normal
Area: API

## Steps to reproduce
1. `curl -s https://api.dreamdex.io/.well-known/oapi.json` lists perp-oriented operations: `GET /v0/markets/{symbol}/funding`, `.../funding/mine`, `.../open-interest`, `.../positions[/mine|/{address}]`, `.../liquidations`, `POST /v0/markets/{symbol}/leverage`, `POST /v0/account/margin/{approve,deposit,withdraw}`, and `kind` (`spot|perp|all`) on `/v0/markets`, `/v0/tickers`, `/v0/orderbooks`, `/v0/trades/all`.
2. `curl -s -i https://stg.api.dreamdex.io/v0/markets/BTC-PERP/funding` and `.../open-interest` (same on api.dreamdex.io).
3. `curl -s "https://stg.api.dreamdex.io/v0/markets?kind=perp"` and `".../v0/tickers?kind=perp"` (same on api.dreamdex.io).
4. `curl -s -i https://stg.api.dreamdex.io/v0/markets/BTC-PERP/trades?limit=1`.

## Expected
Either the perp operations work for the 21 live Hideki perp markets (BTC-PERP etc. exist on chain 50383 and in the app), or the spec/`kind` enum omits them. The Overview page only says the HTTP API base for perps is not documented.

## Actual
- `GET /v0/markets/BTC-PERP/funding` -> `501 {"description":"GetMarketSymbolFunding is not yet implemented","name":"not_implemented","status":501}`; `.../open-interest` -> `501 ... GetMarketSymbolOpenInterest is not yet implemented`.
- `GET /v0/markets?kind=perp` -> `{"markets":[]}`; `GET /v0/tickers?kind=perp` -> `{"symbols":[]}` on both hosts.
- Per-market REST on a perp symbol -> `404 market_not_found: BTC-PERP` (candles, trades, tickers).
So the spec/SDK-generator surface advertises perp REST that exists nowhere; perp data is only reachable via the GraphQL indexer or on-chain reads, which the HTTP API pages never state.

## Evidence
2026-11-02T19:4x UTC, outputs as quoted above (both hosts identical).

## Environment
- https://stg.api.dreamdex.io/v0 (Shannon 50312) and https://api.dreamdex.io/v0 (mainnet 5031); perp markets live on Hideki testnet (50383)
- Date: 2026-11-02 (UTC)
