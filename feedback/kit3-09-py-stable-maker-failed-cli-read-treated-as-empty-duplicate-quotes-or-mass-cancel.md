# dreamdex-bot-kit 07-stable-maker `mm_bot.py` treats a failed `order list` as "no open orders" (places a second pair of postOnly quotes) and a failed `vault balance` as zero balances (cancels both resting quotes)
Severity: normal
Area: SDK

## Steps to reproduce
Save the script and run it. `jrun`/`run` are replaced so no `dreamdex` CLI is needed; the book and vault are healthy and a bid and ask are already resting at the target prices. The CLI exits with rc 3 (the documented transient network error) for exactly one read per scenario.
```python
import sys, logging
sys.dont_write_bytecode = True
sys.path.insert(0, "/tmp/dd/dreamdex-bot-kit/examples/07-stable-maker")
import mm_bot
from mm_bot import Config, Stats
from decimal import Decimal

calls = []
state = {"fail": set()}
RESTING = [
    {"id": "11", "side": "buy",  "price": "0.9999", "remaining": "15"},
    {"id": "12", "side": "sell", "price": "1.0001", "remaining": "15"},
]
def fake_jrun(args, *, timeout=120):
    kind = args[0] + ("-" + args[1] if args[0] in ("vault", "order") else "")
    if kind in state["fail"]:
        return None, 3, "network error"                     # CLI exit 3 = transient network error
    if args[0] == "orderbook":
        return {"orderbooks": [{"bids": [{"price": "0.9999"}], "asks": [{"price": "1.0001"}]}]}, 0, ""
    if args[:2] == ["vault", "balance"]:
        return {"balances": [{"currency": "USDC.e", "amount": "22"}, {"currency": "USDso", "amount": "30"}]}, 0, ""
    if args[:2] == ["order", "list"]:
        return {"orders": RESTING}, 0, ""
mm_bot.jrun = fake_jrun
mm_bot.run = lambda args, **k: (calls.append(" ".join(args[:2] + [args[args.index("--side")+1] if "--side" in args else args[3]])) or (0, "", ""))
logging.basicConfig(level=logging.WARNING, format="  log: %(message)s")

cfg = Config(take=False, peg_aggressive=False)
for label, fail in [("baseline (both reads ok, quotes already resting)", set()),
                    ("transient failure of `order list`", {"order-list"}),
                    ("transient failure of `vault balance`", {"vault-balance"})]:
    calls.clear(); state["fail"] = fail
    mm_bot.cycle(cfg, Stats())
    print(f"{label}: CLI actions -> {calls or 'none'}")
```
Run: `PYTHONPATH=<site-packages with web3,eth_account,structlog,pydantic_settings,dotenv> python3 -B m1_failed_reads.py`

## Expected
A failed read should skip the cycle (or reuse the last good snapshot): with quotes already resting at the right price nothing should be placed or cancelled.

## Actual
```
baseline (both reads ok, quotes already resting): CLI actions -> none
transient failure of `order list`: CLI actions -> ['order place buy', 'order place sell']
transient failure of `vault balance`: CLI actions -> ['order cancel 11', 'order cancel 12']
  log: order list failed rc=3 network error
  log: vault balance read failed rc=3 network error
```
`get_open_orders()` returns `[]` on any CLI failure, so `cur_bid`/`cur_ask` are `None` and the cycle places a new bid and ask on top of the live ones (duplicate quotes, double inventory exposure, 2x gas). `get_vault()` returns `{BASE: None, QUOTE: None}` on failure, but `cycle()` does `vault.get(QUOTE_CCY) or Decimal("0")`, so usdso/usdce become 0, `bid_size`/`ask_size` are 0, and the `elif cur_bid: cancel(...)` branches cancel both live quotes. Only the kill-switch path guards `eq is None`. The shutdown path has the same shape: `for o in get_open_orders(): cancel(...)` leaves orders resting if the read fails during Ctrl-C.

## Evidence
Output above (the CLI actions are what `place()`/`cancel()` would run). Source: `examples/07-stable-maker/mm_bot.py` `get_open_orders` (~L186), `get_vault` (~L173), `cycle` (~L301, ~L353-374).

## Environment
dreamdex-bot-kit main @ 4e75896, examples/07-stable-maker, Python 3.12.3, web3 8.0.0 (pip), no network and no key used (all clients stubbed).
