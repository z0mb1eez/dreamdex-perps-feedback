# dreamdex-bot-kit 06-multipair-competition `_reap_stale_orders` cancels every open order whose `createdAt` is missing or 0 (age is computed as 0 s and the keep-guard is skipped)
Severity: normal
Area: SDK

## Steps to reproduce
Save the script and run it. The bot is built without `__init__`; `_list_open_orders` returns one order without `createdAt`, `_cancel_order` records calls (dry-run, no network).
```python
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, "/tmp/dd/dreamdex-bot-kit/examples/06-multipair-competition/bot")
from executor import LiveDreamDexBot, Market

bot = object.__new__(LiveDreamDexBot)
bot.dry_run = True
m = Market("WETH:USDso", "0x"+"11"*20, "0x"+"22"*20, "0x"+"33"*20, "WETH", "USDso", 18, 6, 0, 1, 1, 1, False, False)
bot.markets_registry = {m.symbol: m}
bot.market = m
bot._set_active_market = lambda s, update_ws=True: None
# an open order whose listing entry has no createdAt (or createdAt 0/null) -> age unknown
bot._list_open_orders = lambda: [{"id": "1001", "side": "buy", "remaining": "0.5", "price": "2000"}]
cancelled = []
bot._cancel_order = lambda oid: cancelled.append(oid) or "0x" + "0"*64
n = bot._reap_stale_orders(max_age_sec=600)
print("max_age_sec=600, order without createdAt -> cancelled:", cancelled, "count:", n)

# control: a fresh order WITH createdAt is kept
import time
bot._list_open_orders = lambda: [{"id": "1002", "side": "buy", "remaining": "0.5", "price": "2000", "createdAt": int(time.time()*1000)}]
cancelled.clear()
print("fresh order with createdAt -> cancelled:", cancelled, "count:", bot._reap_stale_orders(max_age_sec=600))
```
Run: `PYTHONPATH=<site-packages with web3,eth_account,structlog,pydantic_settings,dotenv> python3 -B ex2a_reaper.py`

## Expected
An order of unknown age is not "older than max_age_sec", so it is kept (or the code logs that it cannot judge age).

## Actual
```
max_age_sec=600, order without createdAt -> cancelled: ['1001'] count: 1
fresh order with createdAt -> cancelled: [] count: 0
Reaper cancelled stale buy WETH:USDso age=0s amount=0.5 id=1001…
```
The guard is `if created and age_sec < max_age_sec: continue`. With `created == 0` the condition is false, so execution falls through to `self._cancel_order(oid)`; the log line even prints `age=0s`. The reaper is documented as a safety net for orders older than `max_age_sec`, and `competition.py` runs it every cycle (`bot._reap_stale_orders(self.reaper_max_age_sec)`), so any response shape where `createdAt` is absent/null/renamed makes the bot cancel all its own resting quotes (and pay cancel gas, 6M gas limit each) on every pass. The control line shows a fresh order with `createdAt` is kept.

## Evidence
Output above. Source: `examples/06-multipair-competition/bot/executor.py` `_reap_stale_orders` (~L1684-1694). The documented trades/orders field names are not listed in the HTTP docs, so the field being absent is plausible.

## Environment
dreamdex-bot-kit main @ 4e75896, examples/06-multipair-competition/bot, Python 3.12.3, web3 8.0.0 (pip), no network and no key used (all clients stubbed).
