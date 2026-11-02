# outcomeId() silently aliases out-of-range idx / nonce / pool inputs onto other markets' ids
Severity: normal
Area: SDK

## Steps to reproduce
1. Setup: `mkdir repro && cd repro && npm init -y && npm pkg set type=module && npm i viem @somnia-chain/markets-sdk@0.32.1`
2. Run (`o1.mjs`):
```js
import { outcomeId, decodeOutcomeId } from "@somnia-chain/markets-sdk"
const pool = "0x" + "11".repeat(20)
console.log("idx=256 nonce=1 == idx=0 nonce=1:", outcomeId(pool, 1, 256) === outcomeId(pool, 1, 0))
console.log("idx=256 nonce=0 == idx=0 nonce=1:", outcomeId(pool, 0, 256) === outcomeId(pool, 1, 0))
console.log("idx=2 decodes to:", decodeOutcomeId(outcomeId(pool, 1, 2)))
console.log("nonce=2^64 == nonce=0:", outcomeId(pool, 2n ** 64n, 0) === outcomeId(pool, 0, 0))
console.log("nonce=-1 decodes to:", decodeOutcomeId(outcomeId(pool, -1, 0)).nonce)
console.log("short pool '0x1' decodes to:", decodeOutcomeId(outcomeId("0x1", 1, 0)).pool)
console.log("21-byte pool id bit length:", outcomeId("0x" + "11".repeat(21), 1, 0).toString(2).length, "(a valid id is <= 232 bits)")
```

## Expected
TSDoc: `id = (uint160(pool) << 72) | (nonce << 8) | idx`, "idx is 0 (YES) or 1 (NO)", nonce is a `marketNonce`. The SDK validates inputs elsewhere (fromHuman, snapRawToGrid, probabilityToPrice all throw `InvalidInputError`), so an id builder used to key ERC-6909 balances/redeems should reject an idx outside {0,1}, a nonce outside [0, 2^64), and a pool that is not a 20-byte address, rather than return a different market's id.

## Actual
```
idx=256 nonce=1 == idx=0 nonce=1: true
idx=256 nonce=0 == idx=0 nonce=1: true
idx=2 decodes to: { pool: '0x1111111111111111111111111111111111111111', nonce: 1n, idx: 2 }
nonce=2^64 == nonce=0: true
nonce=-1 decodes to: 18446744073709551615n
short pool '0x1' decodes to: 0x0000000000000000000000000000000000000001
21-byte pool id bit length: 237 (a valid id is <= 232 bits)
```
`BigInt(idx)` is OR-ed unmasked, so idx 256 bleeds into the nonce field (a different market's YES id), nonce is masked with `& NONCE_MASK` (2^64 wraps to 0, -1 to 2^64-1), idx 2 yields an id that belongs to no outcome, and a 21-byte "pool" shifts into bits above the 232-bit layout. TypeScript's `OutcomeIdx = 0 | 1` guards typed callers only; a JS caller or an index read passing a raw number (e.g. `outcomeIndex` from the indexer, which `claimableInputFor` normalises with `=== 1 ? 1 : 0` precisely to avoid this) gets a plausible-looking but wrong id, which then reads another market's balance or targets another market's redeem.

## Environment
- SDK @somnia-chain/markets-sdk 0.32.1
- node v22, Linux, 2026-11-02 (UTC), offline (no RPC needed)
