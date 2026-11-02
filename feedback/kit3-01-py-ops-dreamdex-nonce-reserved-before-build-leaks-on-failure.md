# dreamdex-bot-kit 04-python-ops `DreamDEX.vault_withdraw` / `vault_deposit` / `place_order` approve path reserve a nonce before `build_transaction`; if the build raises (gas estimate revert) the nonce is consumed locally and every later transaction is signed with a gap nonce and never mines
Severity: major
Area: SDK

## Steps to reproduce
1. Clone the kit. 2. Save the script below outside the kit and run it. It uses the kit's real `SomniaWallet` and `DreamDEX.vault_withdraw` with a stubbed `w3` (no RPC): the node reports pending count 5 and `eth_estimateGas` reverts inside `build_transaction()`.

In `backend/trading/dreamdex.py` every raw-contract call is written as `fn(...).build_transaction({"from": ..., "nonce": self.wallet.reserve_nonce(), **self.wallet._gas_fields()})` (approve in `place_order` ~L416, `vault_deposit` ~L664/690/707, `vault_withdraw` ~L746). The nonce argument is evaluated (and the local counter incremented) before `build_transaction` runs its gas estimation, and only `sign_and_send` failures are followed by `reset_nonce()`.
```python
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, "/tmp/dd/dreamdex-bot-kit/examples/04-python-ops/backend")
from unittest.mock import MagicMock
from trading.dreamdex import DreamDEX
from trading.wallet import SomniaWallet
from config import MARKETS

CHAIN_PENDING_COUNT = 5                      # what the node says the next nonce is
w = SomniaWallet(private_key="0x" + "11" * 32)
w.w3 = MagicMock()
w.w3.eth.get_transaction_count.side_effect = lambda *a, **k: CHAIN_PENDING_COUNT
w.w3.eth.get_block.return_value = {"baseFeePerGas": 1}
w.w3.eth.max_priority_fee = 1
# eth_estimateGas reverts inside build_transaction() (e.g. withdraw more than the vault holds)
fn = MagicMock(); fn.build_transaction.side_effect = Exception("execution reverted: insufficient balance")
w.w3.eth.contract.return_value.functions.withdraw.return_value = fn

d = object.__new__(DreamDEX); d.wallet = w
sym = "WETH:USDso"
try:
    d.vault_withdraw(sym, MARKETS[sym]["quote"], 1.0)
except Exception as e:
    print("vault_withdraw raised:", e)
print("local nonce counter after the failed build:", w._nonce, "(chain pending count:", CHAIN_PENDING_COUNT, ")")
print("next transaction will be signed with nonce:", w.reserve_nonce())
```
Run: `PYTHONPATH=<site-packages with web3,eth_account,structlog,pydantic_settings,dotenv> python3 -B d1_nonce_leak.py`

## Expected
A failed build (nothing signed, nothing broadcast) must not advance the local nonce counter; the next transaction should reuse nonce 5 (or the counter should be reset to re-read the chain).

## Actual
```
[DreamDEX] Withdrawing 1.0 token 0x9c32F3827A1a99f0cf9B213de8b53eC3d57bb171 from SpotPool vault...
vault_withdraw raised: execution reverted: insufficient balance
local nonce counter after the failed build: 6 (chain pending count: 5 )
next transaction will be signed with nonce: 6
```
After the failed `vault_withdraw` the local counter is 6 while the chain's pending count is still 5, so the next transaction (including `send_unsigned_tx` for the next order, which calls `reserve_nonce()`) is signed with nonce 6. A node will hold a nonce-6 transaction in the queue forever because nonce 5 never appears, so all later orders/cancels from this process silently stall (they are "sent" and the receipt wait times out) until the process is restarted or something else sends nonce 5. The `would revert` case is the normal outcome of withdrawing more than the vault holds, or of an approve whose estimate reverts, so it is easy to hit.

## Evidence
Output above (kit's real wallet/DreamDEX classes, stubbed `w3`). Source: `examples/04-python-ops/backend/trading/dreamdex.py` and `trading/wallet.py::reserve_nonce`.

## Environment
dreamdex-bot-kit main @ 4e75896, examples/04-python-ops/backend, Python 3.12.3, web3 8.0.0 (pip), no network and no key used (all clients stubbed).
