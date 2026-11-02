# dreamdex-bot-kit 04-python-ops `DreamDEX.place_order` maps any order_type it does not recognise to `immediateOrCancel`, including the API's own names `fillOrKill` and `normalOrder` that its docstring lists
Severity: normal
Area: SDK

## Steps to reproduce
Save the script and run it (stubbed HTTP session, captures the POST body). The module docstring documents `Order types: "gtc" | "fillOrKill" | "immediateOrCancel" | "postOnly"`.
```python
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, "/tmp/dd/dreamdex-bot-kit/examples/04-python-ops/backend")
from unittest.mock import MagicMock
from trading.dreamdex import DreamDEX
sent = []
class R: status_code = 400; text = "stop"
d = object.__new__(DreamDEX)
d.base_url = "https://api.dreamdex.io"; d._ensure_auth = lambda: None
d._session = MagicMock(); d._session.post.side_effect = lambda url, json=None, timeout=None: sent.append(json) or R()
# the module docstring documents: Order types: "gtc" | "fillOrKill" | "immediateOrCancel" | "postOnly"
names = ["gtc", "fillOrKill", "immediateOrCancel", "postOnly", "normalOrder", "fok", "good_till_cancel", "typo"]
for t in names:
    d.place_order("SOMI:USDso", "buy", 10.0, order_type=t, limit_price=0.2)
for t, p in zip(names, sent):
    print(f"order_type={t!r:22} -> API orderType={p['orderType']!r}")
```
Run: `PYTHONPATH=<site-packages with web3,eth_account,structlog,pydantic_settings,dotenv> python3 -B d3_ordertype.py`

## Expected
`fillOrKill` stays fill-or-kill, `normalOrder` stays a resting order, and an unknown/typo'd value raises instead of trading.

## Actual
```
[DreamDEX] place_order HTTP 400: stop
[DreamDEX] place_order HTTP 400: stop
[DreamDEX] place_order HTTP 400: stop
[DreamDEX] place_order HTTP 400: stop
[DreamDEX] place_order HTTP 400: stop
[DreamDEX] place_order HTTP 400: stop
[DreamDEX] place_order HTTP 400: stop
[DreamDEX] place_order HTTP 400: stop
order_type='gtc'                  -> API orderType='normalOrder'
order_type='fillOrKill'           -> API orderType='immediateOrCancel'
order_type='immediateOrCancel'    -> API orderType='immediateOrCancel'
order_type='postOnly'             -> API orderType='postOnly'
order_type='normalOrder'          -> API orderType='immediateOrCancel'
order_type='fok'                  -> API orderType='fillOrKill'
order_type='good_till_cancel'     -> API orderType='immediateOrCancel'
order_type='typo'                 -> API orderType='immediateOrCancel'
```
`type_map.get(order_type.lower(), "immediateOrCancel")` lowercases the key (`"fillorkill"`, `"normalorder"` are not keys) and falls back to IOC for anything unknown. A caller that passes the documented `"fillOrKill"` gets an IOC that can partially fill; `"normalOrder"` (a resting maker order) becomes a taker order that crosses the book; a typo becomes a taker order. No warning is printed.

## Evidence
Output above. Source: `examples/04-python-ops/backend/trading/dreamdex.py` lines ~295-304.

## Environment
dreamdex-bot-kit main @ 4e75896, examples/04-python-ops/backend, Python 3.12.3, web3 8.0.0 (pip), no network and no key used (all clients stubbed).
