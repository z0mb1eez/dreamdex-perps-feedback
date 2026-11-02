# dreamdex-bot-kit `cancelOrder` / `cancelOrderFor` / `ensureAllowance` return success when the transaction reverted (receipt.status is never checked), unlike `placeOrder`
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit && npm install && npm run build -w packages/core` (or use the shipped `packages/core/dist`).
2. Read `packages/core/src/execute.ts`: `placeOrder` and `placeOrderFor` check `receipt.status !== "success"` and throw `TX_REVERTED`; `cancelOrder` (line ~198), `cancelOrderFor` (~211) and `ensureAllowance` (~238) call `await publicClient.waitForTransactionReceipt({ hash })` and discard the result.
3. Demonstrate with a stubbed client whose receipt says the tx reverted (no network, no key). Save `cx.mjs` in a separate directory:
```js
import { cancelOrder } from "<kit>/packages/core/dist/execute.js";
const pool = "0x259fD6559214dd5aD3752322426eA9F9fABEFff4";
const ctx = { account: { address: "0x000000000000000000000000000000000000dEaD" },
  publicClient: { simulateContract: async () => ({ request: {} }),
                  waitForTransactionReceipt: async () => ({ status: "reverted", logs: [], gasUsed: 0n }) },
  walletClient: { chain: undefined, writeContract: async () => "0x" + "ab".repeat(32) } };
console.log("cancelOrder returned:", await cancelOrder(ctx, pool, 123n));
```
4. `node cx.mjs`

## Expected
A reverted cancel (for example the order filled or expired between the simulation and inclusion, or the tx ran out of gas) should throw the same typed `TX_REVERTED` GotchaError that `placeOrder` throws, so callers know the order is still live.

## Actual
```
cancelOrder returned: 0xabababababababababababababababababababababababababababababababab
```
The function resolves with the hash as if the cancel succeeded. `Pool.cancel()` (`packages/core/src/pool.ts`) returns it straight to strategies (`market-making/src/strategy.ts` lines ~121 and ~152, `treasury/src/strategy.ts` ~214), which then assume the resting order is gone and may re-quote on top of it, doubling exposure. `ensureAllowance` likewise continues after a reverted `approve`.

## Evidence
Output of `node cx.mjs` above (stubbed receipt `status: "reverted"`); source lines in `packages/core/src/execute.ts` as listed. This is a code-path reproduction: it needs no funds and does not touch the chain.

The same helper pattern is in `packages/core/src/operator.ts`: `send()` awaits the receipt and returns the hash without checking `status`, so `withdrawVault`, `depositVault`, `grantOperator` and `revokeOperator` also report success for a reverted transaction (a reverted `revokeOperator` would leave an operator authorized while the caller believes it was revoked).

The Python port has the same gap: `packages/core-py/dreamdex_core/execute.py::cancel_order` returns `receipt["transactionHash"].hex()` without checking `receipt["status"]`, while `place_order` raises `TX_REVERTED` on `status != 1`; `ensure_allowance` also ignores the approve receipt.

## Environment
dreamdex-bot-kit main (packages/core TypeScript), Node 22, viem 2.x.
