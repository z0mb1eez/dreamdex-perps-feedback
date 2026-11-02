# dreamdex-bot-kit core-py `cancel_order` and `ensure_allowance` return success when the transaction reverted (receipt status is only checked in `place_order`)
Severity: normal
Area: SDK

## Steps to reproduce
1. Save `f.py` (stubs the signer/sender so every transaction mines with `status = 0`; the web3 install needs `python-dotenv` importable, here stubbed):
```python
import sys, types
sys.path.insert(0, "<kit>/packages/core-py")
m = types.ModuleType("dotenv"); m.load_dotenv = lambda *a, **k: None; sys.modules["dotenv"] = m
from unittest.mock import MagicMock
from dreamdex_core import execute as ex
A = "0x0000000000000000000000000000000000000001"
ctx = MagicMock(); ctx.address = A; ctx.net.chain_id = 1
nm = MagicMock(); nm.reserve.return_value = 0; nm.gas_fields.return_value = {}
ex._sign_send_wait = lambda c, n, tx: {"status": 0, "transactionHash": bytes(32)}   # reverted
ctx.w3.eth.contract.return_value.functions.allowance.return_value.call.return_value = 0
print("cancel_order ->", ex.cancel_order(ctx, nm, A, 7))
print("ensure_allowance ->", ex.ensure_allowance(ctx, nm, A, A, 100), "(no exception)")
```
2. `python3 f.py`

## Expected
Both raise (as `place_order` does with `GotchaError("TX_REVERTED", ...)`) when `receipt["status"] != 1`.

## Actual
```
cancel_order -> 0000000000000000000000000000000000000000000000000000000000000000
ensure_allowance -> None (no exception)
```
`cancel_order` returns the hash of a reverted cancel, so a Python bot believes the order is off the book (and may re-quote on top of a still-resting order). `ensure_allowance` discards `_sign_send_wait`'s receipt, so a reverted `approve` is followed by a `placeOrder` that then fails at simulation with a confusing error, or worse, proceeds. The TS port has the same pattern (already reported); this is the Python port, `packages/core-py/dreamdex_core/execute.py`.

## Evidence
`packages/core-py/dreamdex_core/execute.py`: `cancel_order` ends with `receipt = _sign_send_wait(...); return receipt["transactionHash"].hex()`; `ensure_allowance` ends with `_sign_send_wait(ctx, nm, tx)` and no check.

## Environment
dreamdex-bot-kit main, Python 3.12, web3 v7+; mock only, no network.
