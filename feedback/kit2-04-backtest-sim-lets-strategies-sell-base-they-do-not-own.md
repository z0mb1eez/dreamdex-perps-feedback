# dreamdex-bot-kit backtest `SimPool.place` / `PortfolioLedger` never check balances, so a strategy can sell base it does not hold and spend quote it does not have, producing phantom profit
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `repro.mts` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```ts
import { SimPool } from "<kit>/packages/backtest/src/sim/sim-pool.ts";
import { PortfolioLedger } from "<kit>/packages/backtest/src/sim/ledger.ts";
import { ORDER_TYPE } from "<kit>/packages/core/dist/index.js";
const candle: any = { timestamp: 1000, open: "100", high: "101", low: "99", close: "100", volume: "10" };
const ledger = new PortfolioLedger(1000, 0);                       // 1000 quote, ZERO base
const pool = new SimPool({ symbol: "X:USDso", meta: { tick: 0.01, lot: 0.01, minQty: 0.01 }, ledger });
pool.setCandle(candle);
await pool.place({ isBid: false, price: 99, qty: 500, orderType: ORDER_TYPE.ImmediateOrCancel } as any);
console.log("after selling 500 base with 0 balance: base =", ledger.base, " quote =", ledger.quote);
await pool.place({ isBid: true, price: 101, qty: 5000, orderType: ORDER_TYPE.ImmediateOrCancel } as any);
console.log("after buying 5000 base with ~50k quote:  base =", ledger.base, " quote =", ledger.quote);
```
3. Run `npx tsx repro.mts`

## Expected
The sim rejects (throws) orders the account cannot fund, as the real pool does (the live `Pool.place` guards and the chain reverts on insufficient balance). Backtests should not be able to short spot or go into negative quote.

## Actual
```
after selling 500 base with 0 balance: base = -500  quote = 50975
after buying 5000 base with ~50k quote:  base = 4500  quote = -449275
```
Both orders are accepted. base ends negative (a naked spot short, which does not exist on the exchange) and quote is far above the starting 1000 after a sell of inventory that was never held. A strategy with a bug in its inventory logic therefore backtests as profitable.

## Evidence
`packages/backtest/src/sim/sim-pool.ts` `place()` only checks `args.qty < this.minQty`; `packages/backtest/src/sim/ledger.ts` `applyFill` happily drives `base`/`quote` negative (the `else { this.positionBase -= f.qty }` branch even models a short). `walletBase()/walletQuote()` then report the negative numbers back to the strategy.

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
