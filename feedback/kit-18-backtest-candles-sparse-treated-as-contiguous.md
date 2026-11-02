# Candles endpoint omits intervals with no trades, and dreamdex-bot-kit's backtest feeds the gappy series to strategies as if every bar were contiguous (undocumented in both the API docs and the backtest docs)
Severity: normal
Area: API

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit && npm install`
2. Save as `packages/backtest/gp.ts`, run `npx tsx gp.ts` from `packages/backtest`:
```ts
import { fetchCandlesRange } from "./src/candles/fetch.ts";
const until=Date.now(), since=until-86400000;
const c=await fetchCandlesRange("WETH:USDso","5m",since,until);
const gaps=c.slice(1).map((x,i)=>(x.timestamp-c[i].timestamp)/300000);
console.log("expected 5m bars in 24h: 288; returned:",c.length);
console.log("bars with gap>1 interval:",gaps.filter(g=>g>1).length,"max gap (intervals):",Math.max(...gaps));
```
(Equivalent without the kit: `curl 'https://api.dreamdex.io/v0/markets/WETH:USDso/candles?interval=5m&limit=1000'` and diff consecutive `timestamp`s: gaps of 300000, 600000, 900000 … 3300000 ms.)
3. `npm run backtest -- run momentum --days 1 --quiet` prints `candles=27` for one day of 5m data.

## Expected
Either the candles endpoint zero-volume-fills empty intervals (the usual OHLCV convention, and what ccxt users expect from `fetchOHLCV`), or `GET /v0/markets/{symbol}/candles` documents that empty intervals are omitted; and the backtest forward-fills or at least warns, because strategies are written against a fixed time cadence.

## Actual
```
expected 5m bars in 24h: 288; returned: 27
bars with gap>1 interval: 16 max gap (intervals): 44
```
A "5m" series with holes of up to 220 minutes. Neither the API docs (Trading page, candles endpoint) nor `docs/backtesting.md` mention it. The backtest hands the series to strategies bar-by-bar: e.g. `momentum` measures "window" = last `MOM_WINDOW_SIZE` (20) samples, which live are `POLL_INTERVAL` apart, but in the backtest span many hours across gaps, and `markoutBars` (default 5) means 5 bars not 25 minutes. Results (`candles=27 ... pnl=0.0000`) therefore do not describe how the same strategy behaves live, and a user who passes `--days 1` gets ~9% of the bars they expect with no warning.

## Evidence
Output above (live mainnet REST, unauthenticated). Source: `packages/backtest/src/candles/fetch.ts` `fetchCandlesRange` returns candles exactly as received; `strategies/momentum/src/strategy.ts` rolling window by sample count.

## Environment
api.dreamdex.io/v0 mainnet; dreamdex-bot-kit main, Node 22.
