# Several custom-error argument names differ between the SDK ABI and the Errors docs page
Severity: normal
Area: docs

## Steps to reproduce
1. Fetch the Errors docs page: `curl -s https://app.testnet.dreamdex.io/docs/developers/contracts/errors` (or view it in a browser) and read the tables under "Order lifecycle", "Funding and vault" and "Operators and authorization".
2. Inspect the published SDK's error ABI (version 0.32.1): download `@somnia-chain/markets-sdk@0.32.1` from npm and read `src/contractErrorsAbi.ts` (or `dist/contractErrorsAbi.js`).
3. Compare the argument names for `IncorrectSender(address,address)`, `InsufficientBalance(uint256,uint256)` and `InvalidMsgValue(uint256,uint256)`.
4. Confirm these are naming-only mismatches, not wrong selectors/signatures, by computing each selector and checking it against the documented one:
```js
const { toFunctionSelector } = require('viem');
toFunctionSelector('IncorrectSender(address,address)')          // -> 0xf5e39c1f, matches docs
toFunctionSelector('InsufficientBalance(uint256,uint256)')      // -> 0xcf479181, matches docs
toFunctionSelector('InvalidMsgValue(uint256,uint256)')          // -> 0x1f89f671, matches docs
```
(Ran this against all 49 selector/signature pairs listed on the page — all 49 selectors matched their documented name+types, so the ABI and docs agree on every selector; only these three argument *names* disagree.)

## Expected
Per the docs page:
- `IncorrectSender(address caller, address expected)`
- `InsufficientBalance(uint256 available, uint256 required)`
- `InvalidMsgValue(uint256 expected, uint256 received)`

## Actual
SDK ABI (`src/contractErrorsAbi.ts` in the 0.32.1 tarball) names the same three errors' arguments differently:
```ts
{ type: "error", name: "IncorrectSender",      inputs: [{ name: "sender",   type: "address" }, { name: "expected", type: "address" }] },
{ type: "error", name: "InsufficientBalance",  inputs: [{ name: "balance",  type: "uint256" }, { name: "needed",   type: "uint256" }] },
{ type: "error", name: "InvalidMsgValue",      inputs: [{ name: "expected", type: "uint256" }, { name: "actual",   type: "uint256" }] },
```
`caller`→`sender`, `available`→`balance`, `required`→`needed`, `received`→`actual`. Anyone who decodes a revert with the SDK's ABI (e.g. viem's `decodeErrorResult`, which returns an object keyed by these names) and then reaches for the field name used in the docs prose (`available`, `required`, `received`, `caller`) gets `undefined` instead.

## Evidence
Verified 2026-11-02T04:18Z UTC. ABI inputs read directly from the installed `@somnia-chain/markets-sdk@0.32.1` npm package; docs text copied verbatim from the live Errors page on the same date. Selector-equivalence script and its "0 mismatches out of 49" result shown above.

## Environment
`@somnia-chain/markets-sdk` 0.32.1 (npm), docs page `https://app.testnet.dreamdex.io/docs/developers/contracts/errors` fetched 2026-11-02, Node 22.23.4, viem 2.54.1.
