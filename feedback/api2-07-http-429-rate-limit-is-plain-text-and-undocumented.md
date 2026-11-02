# HTTP 429 rate limit responses are text/plain "rate limit exceeded"; rate limits and 429 are not documented anywhere
Severity: normal
Area: API

## Steps to reproduce
1. Save as `rl.mjs` and run `node rl.mjs` (Node 18+, no dependencies):
```js
const B="https://stg.api.dreamdex.io/v0";let c={};let first;
const rs=await Promise.all(Array.from({length:150},()=>fetch(B+"/markets/SOMI:USDso/tickers")));
for(const r of rs){c[r.status]=(c[r.status]||0)+1; if(r.status==429&&!first){first=r;}}
console.log(c);
console.log([...first.headers.entries()].filter(([k])=>/rate|retry|content-type/i.test(k)),await first.text());
```

## Expected
Error Handling page: "All error responses use a consistent JSON format" with `status`, `name`, `description` and the `Error-Name` header. The error table has no throttling entry, and neither the HTTP API pages nor Error Handling mention the 100-request limit, the `X-RateLimit-*` headers or `Retry-After`, so integrators have no documented guidance.

## Actual
Public unauthenticated GETs are limited to 100 requests per window; the 101st+ return HTTP 429 with `content-type: text/plain; charset=utf-8` and the body `rate limit exceeded` (not JSON, no `name`, no `Error-Name` header). `Retry-After: 1` and `X-RateLimit-Limit/Remaining/Reset` headers are present but undocumented. `X-RateLimit-Reset` is epoch seconds, unit not documented.

## Evidence
```
{ '200': 102, '429': 48 }
[ [ 'content-type', 'text/plain; charset=utf-8' ], [ 'retry-after', '1' ], [ 'x-content-type-options', 'nosniff' ],
  [ 'x-ratelimit-limit', '100' ], [ 'x-ratelimit-remaining', '0' ], [ 'x-ratelimit-reset', '1793646637' ] ] rate limit exceeded
```
Second run: `{ '200': 106, '429': 44 }`, same headers and body.

## Environment
- Network: Somnia testnet (Shannon, chain 50312), spot REST staging API (no perps HTTP base is documented)
- Date: 2026-11-02 19:00-19:20 UTC, every command run twice with identical results
- Base URL: https://stg.api.dreamdex.io/v0
