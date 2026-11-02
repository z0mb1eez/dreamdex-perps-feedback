# CCXT dreamdex: parseOrder sets `average` to the limit price (and cost = filled*limit), ignoring the API's `executionPrice`; JSDoc @see URL 404s
Severity: normal
Area: SDK

## Steps to reproduce
1. Install the CCXT branch as in ccxt-01. In `js/src/dreamdex.js` `parseOrder()` has `'average': price` (the order's limit price) and `cost` is left undefined (CCXT's `safeOrder` then computes `cost = filled * average`).
2. Offline repro with the sample from the source's own comment:
```js
const e = new ccxt.dreamdex({});
const o = e.parseOrder({id:'x',status:'closed',createdAt:1765534169841,symbol:'SOMI:USDso',side:'buy',
  price:'1.25',amount:'500',filled:'500',remaining:'0'},
  {id:'SOMI:USDso',symbol:'SOMI/USDSO',precision:{}});
console.log(o.average, o.cost);   // 1.25 625
```
3. The API's published Order schema has a separate field: `curl -s https://api.dreamdex.io/.well-known/oapi.json` -> `components.schemas.Order.properties` = amount, createdAt, **executionPrice**, expiresAt, filled, id, price, remaining, side, status, symbol, txHash, walletAddress. `executionPrice`, `expiresAt` are never read by `parseOrder`. (`Trade` also has `maker`/`taker` addresses, but `parseTrade` returns `takerOrMaker: undefined`.)
4. Every JSDoc in the integration says `@see https://api.dreamdex.io/v0/.well-known/oapi.json`: `curl -i https://api.dreamdex.io/v0/.well-known/oapi.json` -> 404 `404 page not found` (also on stg.api). The spec is actually served at `/.well-known/oapi.json` (no `/v0`).

## Expected
`average` = actual execution price (the API's `executionPrice`), `cost` = filled * average; `@see` link resolves.

## Actual
A limit buy at 1.25 that executed at 1.20 reports `average 1.25`, `cost 625` (true 600): P&L / fill-cost accounting in CCXT-based bots is overstated for every order that crosses at a better price than its limit. `expiresAt` is dropped as well, so open-order expiry is unavailable in the unified object.

## Evidence
2026-11-02T19:3x UTC: offline run prints `average 1.25 cost 625` for price 1.25 / filled 500; spec fetch shows the `executionPrice` property; `GET /v0/.well-known/oapi.json` -> 404.

## Environment
- ccxt 4.5.53, branch add-dreamdex-exchange, Node 22
- Date: 2026-11-02 (UTC)
