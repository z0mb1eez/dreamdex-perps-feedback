# CCXT dreamdex: watchOrderBook(symbol, limit) ignores `limit`; `has` advertises methods the docs do not list
Severity: normal
Area: SDK

## Steps to reproduce
1. Install the CCXT branch as in ccxt-01 (ccxt 4.5.53).
2. Run:
```js
const e = new ccxt.pro.dreamdex({ walletAddress });
const a = await e.watchOrderBook('SOMI/USDSO', 5);
console.log(a.bids.length, a.asks.length);          // 16 16, not 5
const b = await (new ccxt.dreamdex({})).fetchOrderBook('SOMI/USDSO', 5);
console.log(b.bids.length);                           // 5 (REST honours limit)
```
3. `console.log(Object.entries(e.has).filter(([k,v])=>v===true).map(x=>x[0]))` includes `createMarketOrderWs`, `editOrder`, `fetchMyTrades`, `fetchL2OrderBook`, `createTriggerOrder` etc.; the docs' "Supported Methods" table and "Supported WebSocket methods: watchOrderBook, watchTrades, watchOHLCV" list none of `editOrder`, `fetchMyTrades`, `createMarketOrderWs`. `watchTicker()` throws `NotSupported ... is not supported yet` (consistent with docs).

## Expected
The standard CCXT contract: `watchOrderBook(symbol, limit)` truncates to `limit` levels (as the REST `fetchOrderBook` does). Docs and `has` agree.

## Actual
`watchOrderBook` returns the full cached book (16 levels each side) for limit=5. `has.createMarketOrderWs` is true though no `createOrderWs`/WS trading exists (createOrder only returns an unsigned tx), and `editOrder` throws `NotSupported: editOrder() does not support changing price, only reducing quantity` while `has.editOrder` is true (undocumented partial support).

## Evidence
2026-11-02T19:2x UTC: `wob2 OK {"bids":[[0.1619,1691.24],... 16 levels` for `watchOrderBook('SOMI/USDSO',5)`; REST `fetchOrderBook(S,5)` returned exactly 5 levels.

## Environment
- ccxt 4.5.53, branch add-dreamdex-exchange, Node 22, wss://api.dreamdex.io/v0/ws/public
- Date: 2026-11-02 (UTC)
