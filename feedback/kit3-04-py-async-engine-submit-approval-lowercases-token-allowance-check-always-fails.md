# dreamdex-bot-kit 05-production-async `Engine._submit_approval` passes a lowercased token address to `_wallet_allowance`; web3 v7+ rejects non-checksum addresses, so the on-chain allowance is always treated as 0 and an approve tx is sent for every order
Severity: normal
Area: SDK

## Steps to reproduce
Save the script and run it. It builds the kit's real `Engine` with an `AsyncWeb3` whose provider reports an allowance of 1e30, then calls `_submit_approval` with a tiny required amount. (`siwe` is stubbed in the snippet only because its grammar dependency currently fails to import; `rest_client` is not used on this path.)
```python
import asyncio
import sys, types, os
sys.dont_write_bytecode = True
os.environ.setdefault("WALLET_ADDRESS", "0x" + "1" * 40)
os.environ.setdefault("PRIVATE_KEY", "0x" + "1" * 64)
os.environ.setdefault("NETWORK", "testnet")
# siwe needs a grammar lib that breaks on current abnf; unused by the code paths exercised here
m = types.ModuleType("siwe"); m.SiweMessage = object; sys.modules["siwe"] = m
sys.path.insert(0, "/tmp/dd/dreamdex-bot-kit/examples/05-production-async/src")
from decimal import Decimal
from unittest.mock import MagicMock, AsyncMock
from web3 import AsyncWeb3
from web3.providers.async_base import AsyncBaseProvider
from dreamdex_bot.config import MarketSymbol, Settings, Network
from dreamdex_bot.core.engine import Engine

HUGE = 10**30
class P(AsyncBaseProvider):          # node that reports allowance(owner, pool) = 1e30 (more than enough)
    async def make_request(self, method, params):
        return {"jsonrpc": "2.0", "id": 1, "result": hex(HUGE).replace("0x", "0x" + "0"*(64-len(hex(HUGE))+2))}
    async def is_connected(self, show_traceback=False): return True

async def main():
    s = Settings(network=Network.TESTNET, wallet_address="0x"+"1"*40, private_key="0x"+"1"*64)
    signer = MagicMock(); signer.address = "0x"+"1"*40
    signer.w3 = AsyncWeb3(P())
    signer.send_tx = AsyncMock(return_value="0xabc")
    signer.wait_for_receipt = AsyncMock(return_value={"status": 1, "blockNumber": 1})
    rest = MagicMock()
    rest.prepare_vault_approve = AsyncMock(return_value={"to": "0xtoken", "data": "0xapprove", "value": 0, "gas": 200000})
    eng = Engine(settings=s, signer=signer, rest=rest, ws=MagicMock(), strategies=[], risk=MagicMock(),
                 starting_capital_usd=Decimal(50), markets_to_watch=[MarketSymbol.SOMI_USDSO])
    m = MarketSymbol.SOMI_USDSO
    tok = s.quote_token(m)
    print("token from settings:", tok)
    print("direct _wallet_allowance(checksummed) =", await eng._wallet_allowance(AsyncWeb3.to_checksum_address(tok), "0x"+"2"*40))
    await eng._submit_approval(m, {"token": tok, "amount": "1000000"})
    print("approve txs sent although on-chain allowance is 1e30 >= 1e6:", signer.send_tx.await_count)
asyncio.run(main())
```
Run: `PYTHONPATH=<site-packages with web3,eth_account,structlog,pydantic_settings,dotenv> python3 -B e1_allowance.py`

## Expected
Allowance 1e30 >= required 1e6, so `engine.approval_skipped_onchain` is logged and no approve transaction is sent.

## Actual
```
token from settings: 0x9c32F3827A1a99f0cf9B213de8b53eC3d57bb171
direct _wallet_allowance(checksummed) = 1000000000000000000000000000000
2026-11-02 14:16:24 [warning  ] engine.allowance_fetch_failed  currency=USDso error="('web3.py only accepts checksum addresses. The software that gave you this non-checksum address should be considered unsafe, please file it as a bug on their platform. Try using an ENS name instead. Or, if you must accept lower safety, use Web3.to_checksum_address(lower_case_address).', '0x9c32f3827a1a99f0cf9b213de8b53ec3d57bb171')" market=SOMI:USDso
2026-11-02 14:16:24 [warning  ] engine.approval_gas_estimate_failed error="when sending a str, it must be a hex string. Got: '0xapprove'" fallback_gas=3000000
2026-11-02 14:16:24 [info     ] engine.approval_submitted      currency=USDso market=SOMI:USDso tx_hash=0xabc
approve txs sent although on-chain allowance is 1e30 >= 1e6: 1
```
`_submit_approval` does `token = str(approval.get("token", "")).lower()` and calls `self._wallet_allowance(token, spender)` which does `eth.call({"to": token, ...})`. web3 raises `InvalidAddress` for a lowercase address, the `except Exception` swallows it as `allowance_fetch_failed`, allowance becomes 0, and the engine sends an on-chain approve (`signer.send_tx` was awaited once above) even though the allowance is already sufficient. With `approval.mode: exact` that is one extra approve tx and ~1 receipt wait per order, and it burns gas. The repo's tests miss it because they mock `w3.eth.call` with an AsyncMock that never validates addresses (`_wallet_token_balance` in the same file does call `Web3.to_checksum_address`).

## Evidence
Output above, including the `InvalidAddress` text in the `engine.allowance_fetch_failed` warning and `approve txs sent ... : 1`. Source: `examples/05-production-async/src/dreamdex_bot/core/engine.py` `_submit_approval` (~L1489) and `_wallet_allowance` (~L1611).

## Environment
dreamdex-bot-kit main @ 4e75896, examples/05-production-async, Python 3.12.3, web3 8.0.0 (pip), no network and no key used (all clients stubbed). (the "approval_gas_estimate_failed" line in the output is only because the stub prep data is `0xapprove`.)
