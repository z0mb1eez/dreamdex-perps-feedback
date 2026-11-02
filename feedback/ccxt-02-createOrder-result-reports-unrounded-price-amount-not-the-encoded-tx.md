# CCXT dreamdex: createOrder() returns the caller's raw price/amount, while the unsigned tx encodes silently rounded values
Severity: normal
Area: SDK

## Steps to reproduce
1. Install the CCXT branch as in ccxt-01.
2. Run (market SOMI/USDSO has tickSize 0.0001, lotSize 0.01):
```js
const r = await e.createOrder('SOMI/USDSO', 'limit', 'buy', 1.2345, 0.12345);
console.log(r.price, r.amount, r.info.approval);
// decode r.info.data (placeOrder 0x4e978373): word2 = price, word3 = quantity
```
Capture the outgoing request (override `e.fetch`): body is `{"amount":"1.23","price":"0.1235", ...}`.

## Expected
The returned unified order describes what will actually be placed, or the call rejects off-tick / off-lot inputs.

## Actual
`createOrder` rounds with `priceToPrecision`/`amountToPrecision` (price 0.12345 -> 0.1235, i.e. rounded UP against a buyer; amount 1.2345 -> 1.23) before the request, and the unsigned tx encodes price `123500000000000000` and qty `1230000000000000000`. But the returned object has `price: 0.12345`, `amount: 1.2345` (the inputs). The approval amount `0.151905` (=1.23*0.1235) also differs from what the returned order implies. A bot that logs/tracks the returned order believes it holds 1.2345 @ 0.12345.

## Evidence
2026-11-02T19:1x UTC:
```
REQ POST https://api.dreamdex.io/v0/markets/SOMI:USDso/orders {"walletAddress":"0x546D..","type":"limit","side":"buy","amount":"1.23","price":"0.1235"}
price 123500000000000000n qty 1230000000000000000n
returned: price 0.12345 amount 1.2345 info.approval.amount 0.151905
```

## Environment
- ccxt 4.5.53, branch add-dreamdex-exchange, Node 22, https://api.dreamdex.io/v0
- Date: 2026-11-02 (UTC)
