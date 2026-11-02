# dreamdex-bot-kit 06-multipair-competition `_funding_for_order_type` checks for `"normal"` / `"goodTillCancelled"`, but the executor's own resting order type is `"normalOrder"`, so `funding_source_maker` is ignored for GTC orders
Severity: normal
Area: SDK

## Steps to reproduce
Save the script and run it (no network; only the pure mapping function is called).
```python
import sys
sys.dont_write_bytecode = True
sys.path.insert(0, "/tmp/dd/dreamdex-bot-kit/examples/06-multipair-competition/bot")
from executor import LiveDreamDexBot, ORDER_TYPE_API

bot = object.__new__(LiveDreamDexBot)
bot.funding_source_maker, bot.funding_source_taker = "vault", "wallet"   # maker orders vault-funded, takers wallet-funded
bot.volume_mode = False; bot.bulk_mode = False; bot.use_fok_for_bulk = False; bot.order_type_default = "immediateOrCancel"
print("executor ORDER_TYPE_API values:", sorted(ORDER_TYPE_API.values()))
for t in ("postOnly", "normalOrder", "immediateOrCancel", "fillOrKill"):
    print(f"{t:18} -> fundingSource {bot._funding_for_order_type(t)}")
```
Run: `PYTHONPATH=<site-packages with web3,eth_account,structlog,pydantic_settings,dotenv> python3 -B ex2b_funding.py`

## Expected
Every non-taker (resting) order type, `postOnly` and `normalOrder`, uses `funding_source_maker` (vault), because docs say resting orders need vault funding.

## Actual
```
executor ORDER_TYPE_API values: ['fillOrKill', 'immediateOrCancel', 'normalOrder', 'postOnly']
postOnly           -> fundingSource vault
normalOrder        -> fundingSource wallet
immediateOrCancel  -> fundingSource wallet
fillOrKill         -> fundingSource wallet
```
`ORDER_TYPE_API` defines `normalOrder` but `_funding_for_order_type` tests `ot in ("postOnly", "goodTillCancelled", "normal")`. `normalOrder` therefore gets `funding_source_taker` (wallet). A strategy configured with a GTC maker type (`order_type_maker: normalOrder`) and `funding_source_maker: vault` posts wallet-funded resting orders, which locks wallet balance instead of vault balance and breaks the vault top-up/escrow accounting the rest of the file assumes.

## Evidence
Output above. Source: `examples/06-multipair-competition/bot/executor.py` `_funding_for_order_type` (~L1550) vs `ORDER_TYPE_API` (~L45).

## Environment
dreamdex-bot-kit main @ 4e75896, examples/06-multipair-competition/bot, Python 3.12.3, web3 8.0.0 (pip), no network and no key used (all clients stubbed).
