# dreamdex-bot-kit core-py `to_raw` rounds (banker's rounding) instead of truncating, so it can return more than the human amount: sizes and prices round UP above the balance, and ties round inconsistently
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit` (no install needed: the script loads `quant.py` directly, so `web3` is not required).
2. Save this as `raw.py` in a separate directory (replace `<kit>` with the path of the clone). It uses stubbed clients / pure functions only: no funds, no key, no chain access.
```python
# run:  python3 -I raw.py   (loads quant.py directly, so web3 is not needed)
import importlib.util
s = importlib.util.spec_from_file_location("quant", "<kit>/packages/core-py/dreamdex_core/quant.py")
q = importlib.util.module_from_spec(s); s.loader.exec_module(q)
print("to_raw(0.1234567, 6)  =", q.to_raw(0.1234567, 6), "  (human 0.1234567 -> 0.123457 is MORE than requested)")
print("to_raw('0.0000005',6) =", q.to_raw("0.0000005", 6), " to_raw('0.0000015',6) =", q.to_raw("0.0000015", 6), " (half-even ties)")
print("align_to_tick(105, 10, 'BID') =", q.align_to_tick(105, 10, "BID"), " align_to_tick(105, 10, 'bid') =", q.align_to_tick(105, 10, "bid"))
```
3. Run `python3 -I raw.py`

## Expected
`to_raw(0.1234567, 6)` is 123456 (never more than requested), consistent with `align_to_lot`'s documented rule 'round DOWN ... never over-spend'. An unknown `side` such as `"BID"` is rejected (or case-folded) instead of being treated as an ask.

## Actual
```
to_raw(0.1234567, 6)  = 123457   (human 0.1234567 -> 0.123457 is MORE than requested)
to_raw('0.0000005',6) = 0  to_raw('0.0000015',6) = 2  (half-even ties)
align_to_tick(105, 10, 'BID') = 110  align_to_tick(105, 10, 'bid') = 100
```
`to_raw` returns 123457 (rounded up past the requested quantity), `0.0000005` -> 0 but `0.0000015` -> 2, and `"BID"` silently rounds a bid UP to 110 where `"bid"` rounds down to 100.

## Evidence
`packages/core-py/dreamdex_core/quant.py` line 15 `.to_integral_value()` (default ROUND_HALF_EVEN) and `align_to_tick` (`return price_raw - rem if side == "bid" else price_raw - rem + tick_raw`). Callers that convert a wallet balance or a notional/price into a quantity before `align_to_lot` can end up one lot over the balance. The TS `toRaw` problem is already reported as kit-07; this is the Python port's own, different, behaviour.

Output above was captured on the kit at commit 4e75896 (stubbed clients, nothing sent on-chain).

## Environment
dreamdex-bot-kit main @ 4e75896, Node v22.23.4, tsx (npx), viem 2.x, @somnia-chain/markets-sdk as installed by the kit, Python 3 for core-py.
