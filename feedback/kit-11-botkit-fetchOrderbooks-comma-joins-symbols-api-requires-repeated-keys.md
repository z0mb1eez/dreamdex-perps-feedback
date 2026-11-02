# dreamdex-bot-kit `DreamDexRest.fetchOrderbooks(symbols)` comma-joins the symbols; the live API (and the docs) require repeated `symbols=` keys, so any call with two or more symbols fails with 400
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit && npm install && npm run build -w packages/core` (or use the shipped `packages/core/dist`).
2. In a separate directory save `ob.mjs` (read-only, public endpoint, no key; the stub account is never asked to sign because `auth: false`):
```js
import { DreamDexRest } from "<kit>/packages/core/dist/rest.js";
const net = { restApi: "https://stg.api.dreamdex.io/v0", chainId: 50312 };
const r = new DreamDexRest(net, { address: "0x000000000000000000000000000000000000dEaD" });
for (const syms of [["SOMI:USDso"], ["SOMI:USDso", "WETH:USDso"]]) {
  try { const o = await r.fetchOrderbooks(syms, 2); console.log(JSON.stringify(syms), "OK", JSON.stringify(o).slice(0, 90)); }
  catch (e) { console.log(JSON.stringify(syms), "ERR", e.message.slice(0, 170)); }
}
```
3. `node ob.mjs`
4. Equivalent curl: `curl -s 'https://stg.api.dreamdex.io/v0/orderbooks?symbols=SOMI:USDso,WETH:USDso'` (400) vs `curl -s 'https://stg.api.dreamdex.io/v0/orderbooks?symbols=SOMI:USDso&symbols=WETH:USDso'` (200).

## Expected
`fetchOrderbooks` ("Canonical multi-symbol orderbook endpoint", `packages/core/src/rest.ts`) returns the books for every requested symbol. The HTTP API docs (Market Data page, "Order book depth") state: "Pass multiple symbols as repeated keys, not a comma-separated list."

## Actual
```
["SOMI:USDso"] OK {"orderbooks":[{"asks":[{"price":"0.1711","quantity":"463.5"},{"price":"0.1712","quantity":"...
["SOMI:USDso","WETH:USDso"] ERR DreamDEX API 400 invalid_param: {"context":{"invalid_symbols":["SOMI:USDso,WETH:USDso"]},"description":"unknown market symbols: SOMI:USDso,WETH:USDso","name":"invalid_param", ...
```
The helper builds `symbols=${encodeURIComponent(symbols.join(","))}`, which the server parses as one literal symbol. It only works for a single symbol, so the "multi-symbol" helper is broken for its stated purpose. Fix: append one `symbols` key per symbol (`URLSearchParams.append`), as `packages/backtest/src/candles/fetch.ts` already does for tickers.

## Evidence
Output above from the kit's compiled `packages/core/dist/rest.js` against `https://stg.api.dreamdex.io/v0`, 2026-11-02.

## Environment
dreamdex-bot-kit main (packages/core TypeScript), Node 22; stg.api.dreamdex.io/v0.
