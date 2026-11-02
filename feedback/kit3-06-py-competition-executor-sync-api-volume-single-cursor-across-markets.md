# dreamdex-bot-kit 06-multipair-competition `LiveDreamDexBot._sync_api_volume` shares one `_last_trades_since_ms` cursor across all markets while fetching one market's trades per call, so volume from every market except the first synced is dropped
Severity: normal
Area: SDK

## Steps to reproduce
Save the script and run it. `LiveDreamDexBot` is created without `__init__` (no RPC); `_fetch_my_trades` is replaced by a stub that serves `/trades/mine` per active market, newest first, honouring `since`. Market A has one fill at T, market B one fill 60 s earlier; the loop below is what a multi-market bot does when it rotates `self.market`.
```python
import sys, os
sys.dont_write_bytecode = True
KIT = "/tmp/dd/dreamdex-bot-kit/examples/06-multipair-competition/bot"
sys.path.insert(0, KIT)
import executor
from executor import LiveDreamDexBot, Market
from decimal import Decimal

def mk(sym):
    return Market(sym, "0x"+"11"*20, "0x"+"22"*20, "0x"+"33"*20, "B", "USDso", 18, 6, 0, 1, 1, 1, False, False)

bot = object.__new__(LiveDreamDexBot)
bot.metrics = {"api_volume_quote_raw": 0}
bot._last_trades_since_ms = 0
bot.markets_registry = {"WETH:USDso": mk("WETH:USDso"), "SOMI:USDso": mk("SOMI:USDso")}
bot.market = bot.markets_registry["WETH:USDso"]
NOW = 1_800_000_000_000
# per-market fills returned by GET /v0/markets/{symbol}/trades/mine (newest first)
TRADES = {
    "WETH:USDso": [{"cost": "100", "timestamp": NOW}],            # most recent fill, market A
    "SOMI:USDso": [{"cost": "40",  "timestamp": NOW - 60_000}],   # older fill, market B (60 s earlier)
}
def fake_fetch(since_ms=None):
    return [t for t in TRADES[bot.market.symbol] if since_ms is None or t["timestamp"] >= since_ms]
bot._fetch_my_trades = fake_fetch
import time; time.time = lambda: NOW/1000 + 5

for sym in ("WETH:USDso", "SOMI:USDso"):       # one pass of the multi-market loop
    bot.market = bot.markets_registry[sym]
    bot._sync_api_volume()
    print(sym, "-> api_volume_quote_raw =", bot.metrics["api_volume_quote_raw"], " cursor =", bot._last_trades_since_ms)
print("expected total raw volume:", (100+40)*10**6)
```
Run: `PYTHONPATH=<site-packages with web3,eth_account,structlog,pydantic_settings,dotenv> python3 -B ex1_sync_volume.py`

## Expected
Total API volume is 100 + 40 = 140 USDso (140000000 raw).

## Actual
```
WETH:USDso -> api_volume_quote_raw = 100000000  cursor = 1800000000001
SOMI:USDso -> api_volume_quote_raw = 100000000  cursor = 1800000000001
expected total raw volume: 140000000
```
The cursor is advanced to `latest_ts + 1` after market A, so market B's older fill (`timestamp < cursor`) is filtered out by `since` and never counted: `api_volume_quote_raw` stays 100000000. Because `competition_stats()` / the strategy's `effective_volume` read this metric, multi-pair runs under-report their leaderboard volume by every fill that is older than the newest fill of whichever market is synced first, and the missing fills are never recovered (the cursor only moves forward). Fix: keep the cursor per symbol.

## Evidence
Output above. Source: `examples/06-multipair-competition/bot/executor.py` `_sync_api_volume` (~L1755) and `_fetch_my_trades` (~L1743, uses `self.market.symbol`).

## Environment
dreamdex-bot-kit main @ 4e75896, examples/06-multipair-competition/bot, Python 3.12.3, web3 8.0.0 (pip), no network and no key used (all clients stubbed).
