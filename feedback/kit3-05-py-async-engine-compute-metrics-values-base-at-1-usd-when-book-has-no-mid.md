# dreamdex-bot-kit 05-production-async `Engine._compute_metrics` marks base inventory at price 1 when the book has no mid, so an empty/one-sided book looks like a ~90% drawdown and trips the `max_drawdown` kill switch
Severity: major
Area: SDK

## Steps to reproduce
Save the script and run it (real `Engine` and `MaxDrawdownRule`, stubbed signer/rest/ws). The wallet holds 0.3 WETH and 100 USDso against 1000 starting capital.
```python
import sys, types, os
sys.dont_write_bytecode = True
os.environ.setdefault("WALLET_ADDRESS", "0x" + "1" * 40)
os.environ.setdefault("PRIVATE_KEY", "0x" + "1" * 64)
os.environ.setdefault("NETWORK", "testnet")
# siwe needs a grammar lib that breaks on current abnf; unused by the code paths exercised here
m = types.ModuleType("siwe"); m.SiweMessage = object; sys.modules["siwe"] = m
sys.path.insert(0, "/tmp/dd/dreamdex-bot-kit/examples/05-production-async/src")
from decimal import Decimal
from unittest.mock import MagicMock
from dreamdex_bot.config import MarketSymbol, Settings, Network
from dreamdex_bot.core.engine import Engine
from dreamdex_bot.core.risk_manager import MaxDrawdownRule

s = Settings(network=Network.TESTNET, wallet_address="0x"+"1"*40, private_key="0x"+"1"*64)
M = MarketSymbol.WETH_USDSO
eng = Engine(settings=s, signer=MagicMock(address="0x"+"1"*40), rest=MagicMock(), ws=MagicMock(last_message_ts=0),
             strategies=[], risk=MagicMock(), starting_capital_usd=Decimal(1000), markets_to_watch=[M])
st = eng.inventory_tracker.get(M)
st.wallet_base = Decimal("0.3")      # 0.3 WETH (~$900 at $3000)
st.wallet_quote = Decimal("100")
def metrics(book):
    eng.market_state[M] = book
    return eng._compute_metrics(eng.inventory_tracker.to_strategy_view({}))
good = eng._empty_state(M); good.best_bid, good.best_ask, good.mid = Decimal(2999), Decimal(3001), Decimal(3000)
m1 = metrics(good)
print("two-sided book (mid 3000): total_value=%s drawdown_pct=%s" % (m1.total_value_usd, m1.drawdown_pct))
empty = eng._empty_state(M)       # book momentarily empty / one-sided -> mid None
m2 = metrics(empty)
print("mid=None book           : total_value=%s drawdown_pct=%s" % (m2.total_value_usd, m2.drawdown_pct))
print("MaxDrawdownRule fires:", bool(MaxDrawdownRule("max_drawdown", {"max_drawdown_pct": "30.0"}).evaluate({}, {}, m2)))
```
Run: `PYTHONPATH=<site-packages with web3,eth_account,structlog,pydantic_settings,dotenv> python3 -B e2_mark.py`

## Expected
A missing mid should mean "cannot mark": reuse the last known mid or skip the drawdown check for this tick. Total value stays about 1000 and no drawdown event fires.

## Actual
```
two-sided book (mid 3000): total_value=1000.0 drawdown_pct=0.0
mid=None book           : total_value=100.3 drawdown_pct=-89.9700
MaxDrawdownRule fires: True
```
`mark_price = mark.mid if mark and mark.mid else Decimal(1)` (engine.py ~L991) values 0.3 WETH at $0.30 whenever the book is empty or one-sided (`_book_to_state` leaves `mid=None`; `initialize()` also installs `_empty_state` when the first book fetch fails). Total value collapses from 1000 to 100.3, drawdown -89.97%, and `MaxDrawdownRule` returns a KILL_SWITCH event. After the 3-tick confirmation in `_confirm_drawdown_events` the engine cancels all orders, sets `_max_drawdown_handled`, and requests a safe exit that market-sells the real inventory (`_flatten_erc20_inventory`). On a thin testnet book a few seconds of one-sided book is enough. The same `Decimal(1)` default feeds the `total_value_usd` used by every other risk rule.

## Evidence
Output above. Source: `examples/05-production-async/src/dreamdex_bot/core/engine.py::_compute_metrics`.

## Environment
dreamdex-bot-kit main @ 4e75896, examples/05-production-async, Python 3.12.3, web3 8.0.0 (pip), no network and no key used (all clients stubbed).
