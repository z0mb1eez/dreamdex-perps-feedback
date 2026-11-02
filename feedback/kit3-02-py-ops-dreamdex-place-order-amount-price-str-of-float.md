# dreamdex-bot-kit 04-python-ops `DreamDEX.place_order` sends `amount` and a caller-supplied `limit_price` as `str(float)`, producing `1e-05` and `0.30000000000000004` in the API body
Severity: normal
Area: SDK

## Steps to reproduce
Save the script and run it. It stubs the HTTP session and captures the JSON body that `place_order` POSTs to `/v0/markets/{symbol}/orders` (the stub answers 400 so the method returns right after the POST).
```python
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, "/tmp/dd/dreamdex-bot-kit/examples/04-python-ops/backend")
from unittest.mock import MagicMock
from trading.dreamdex import DreamDEX
sent = []
class R:                       # API answers 400 so place_order returns right after the POST
    status_code = 400; text = "bad"
d = object.__new__(DreamDEX)
d.base_url = "https://api.dreamdex.io"; d._ensure_auth = lambda: None
d._session = MagicMock(); d._session.post.side_effect = lambda url, json=None, timeout=None: sent.append(json) or R()
for qty, px in [(0.00001, 0.00001), (0.1 + 0.2, 1e-05), (0.0001, 3000.0)]:
    d.place_order("WBTC:USDso", "buy", qty, order_type="limit", limit_price=px)
for p in sent:
    print("amount=%r price=%r" % (p["amount"], p["price"]))
```
Run: `PYTHONPATH=<site-packages with web3,eth_account,structlog,pydantic_settings,dotenv> python3 -B d2_payload.py`

## Expected
`amount` and `price` are plain decimal strings on the market's lot/tick grid (`0.00001`, `0.3`, `3000`), as the API's `invalid_amount` rule (valid decimal, multiple of lotSize) expects.

## Actual
```
[DreamDEX] place_order HTTP 400: bad
[DreamDEX] place_order HTTP 400: bad
[DreamDEX] place_order HTTP 400: bad
amount='1e-05' price='1e-05'
amount='0.30000000000000004' price='1e-05'
amount='0.0001' price='3000.0'
```
Python's `str(float)` switches to scientific notation below 1e-4 and keeps binary-float noise, so the body contains `'1e-05'` and `'0.30000000000000004'`. WBTC (8 decimals) quantities and prices such as 0.00001 are exactly the sizes this wrapper trades. In the market-price branch the code formats the price with `f"{snapped:.{tick_decimals}f}"`, but `amount=str(qty)` (L308) and `price=str(limit_price)` (L322) have no such formatting.

## Evidence
Captured request bodies above. Source: `examples/04-python-ops/backend/trading/dreamdex.py` lines ~308 and ~322.

## Environment
dreamdex-bot-kit main @ 4e75896, examples/04-python-ops/backend, Python 3.12.3, web3 8.0.0 (pip), no network and no key used (all clients stubbed).
