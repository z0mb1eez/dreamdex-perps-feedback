# dreamdex-bot-kit `packages/core` operator.ts (`depositVault`, `withdrawVault`, `grantOperator`, `revokeOperator`, `setManualVaultMode`) return a tx hash as success when the transaction reverted
Severity: normal
Area: SDK

## Steps to reproduce
1. In a clone of the kit with dependencies installed, save `a.mts` (it imports the kit's own `packages/core/src/operator.ts` and stubs the chain clients so that every transaction mines with `status: "reverted"`; no network or key is used):
```ts
import { depositVault, withdrawVault, grantOperator, setManualVaultMode } from "<kit>/packages/core/src/operator.ts";
const A = "0x0000000000000000000000000000000000000001" as const;
const ctx: any = {
  account: { address: A }, net: { operatorRegistry: A },
  walletClient: { chain: {}, writeContract: async () => "0x" + "ab".repeat(32) },
  publicClient: { readContract: async () => 0n, waitForTransactionReceipt: async () => ({ status: "reverted" }) },
};
for (const [n, f] of Object.entries({
  depositVault: () => depositVault(ctx, A, A, 5n),
  withdrawVault: () => withdrawVault(ctx, A, A, 5n),
  grantOperator: () => grantOperator(ctx, A, A),
  setManualVaultMode: () => setManualVaultMode(ctx, A, true),
})) { try { console.log(n, "-> resolved", await (f as any)()); } catch (e: any) { console.log(n, "-> threw", e.message); } }
```
2. `<kit>/node_modules/.bin/tsx a.mts`

## Expected
A reverted transaction raises an error, as `perp-core/src/operator.ts` `send()` already does (`if (receipt.status !== "success") throw ...`). A caller that runs `grantOperator(...)` and then starts a session-key bot must be able to tell the grant did not happen.

## Actual
```
depositVault -> resolved 0xabababababababababababababababababababababababababababababababab
withdrawVault -> resolved 0xabababababababababababababababababababababababababababababababab
grantOperator -> resolved 0xabababababababababababababababababababababababababababababababab
setManualVaultMode -> resolved 0xabababababababababababababababababababababababababababababababab
```
All four return the hash of a reverted tx as if it had succeeded. The private helper `send()` (`packages/core/src/operator.ts`, top of file) only does `await ctx.publicClient.waitForTransactionReceipt({ hash }); return hash;` and discards the receipt. Note `depositVault` also approves through the same helper, so a reverted `approve` is followed by a `deposit` anyway.

## Evidence
`packages/core/src/operator.ts` `send()`; compare `packages/perp-core/src/operator.ts` `send()`, which checks `receipt.status`. This is the same class as the existing report on `cancelOrder` / `ensureAllowance`, but in different functions (vault custody and operator grants) that the docs/session-keys flow depends on.

## Environment
dreamdex-bot-kit main, Node 22, tsx; pure mock, nothing sent.
