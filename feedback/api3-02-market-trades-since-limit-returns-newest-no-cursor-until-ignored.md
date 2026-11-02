# GET /v0/markets/{symbol}/trades: `since` + `limit` returns the NEWEST trades (gaps are unrecoverable); no cursor, and a documented-elsewhere `until` is silently ignored
Severity: normal
Area: API

## Steps to reproduce
1. `S=$(( $(date +%s)*1000 - 1800000 ))`
2. `curl -s "https://stg.api.dreamdex.io/v0/markets/SOMI:USDso/trades?since=$S&limit=3"`
3. `curl -s "https://stg.api.dreamdex.io/v0/markets/SOMI:USDso/trades?since=$S&limit=1000"` and compare timestamps.
4. `curl -s "https://stg.api.dreamdex.io/v0/markets/SOMI:USDso/trades?until=1&limit=1"`
5. Spec: `curl -s https://api.dreamdex.io/.well-known/oapi.json` -> the operation takes only `symbol, since, limit` (no `cursor`, no `until`), while the sibling `GET /v0/trades/all` and `GET /v0/trades` have `cursor`, and the shared `TradeUntil` parameter exists in the spec.

## Expected
`since` is documented as "Return trades after this unix millisecond timestamp". A consumer that polls `since=<last seen timestamp>&limit=N` expects the N trades immediately after that timestamp (or a cursor to continue), so no trade is skipped. Unknown/unsupported query parameters (`until`) should be rejected like other invalid params, not ignored.

## Actual
Results are newest-first and `limit` keeps the newest N inside the window. In a 30 minute window with 175 trades, `limit=3` returned offsets (ms after `since`) `[1800243, 1790242, 1780242]` while `limit=1000` returned 175 trades with the oldest at `+9878`; the 172 older trades cannot be retrieved with `limit=3`, and the endpoint offers no `cursor`/`until` to walk backwards or forwards. A poller whose interval sees more than `limit` trades silently loses the rest. `until=1` is accepted and ignored (200, newest trades returned) - a typo-prone silent no-op that can make code think it is time-bounding queries. `GET /v0/trades/all` (undocumented, see api3-01) is the only cursor-paged trade feed.

## Evidence
2026-11-02T19:2x UTC:
```
since=S&limit=3    -> offsets [1800243, 1790242, 1780242]
since=S&limit=1000 -> 175 trades, newest +1800243, oldest +9878, ordered desc
until=1&limit=1    -> 200 [1793646819242]   (latest trade, filter ignored)
```

## Environment
- Spot REST: https://stg.api.dreamdex.io/v0 (Shannon, 50312)
- Date: 2026-11-02 (UTC)
