# CCXT dreamdex: vaultApprove() for native SOMI returns the string "null\n", not undefined as the source comment and JSDoc promise
Severity: normal
Area: SDK

## Steps to reproduce
1. `npm install github:somnia-chain/ccxt#add-dreamdex-exchange` (ccxt 4.5.53 in the install; file `js/src/dreamdex.js`).
2. Run:
```js
import ccxt from 'ccxt';
const e = new ccxt.dreamdex({ walletAddress, privateKey });   // any funded or unfunded wallet
const r = await e.vaultApprove('SOMI/USDSO', 'SOMI', 100);
console.log(typeof r, JSON.stringify(r));
const r2 = await e.vaultApprove('SOMI/USDSO', 'USDso', 100);
console.log(typeof r2);
```

## Expected
`vaultApprove` JSDoc: "@returns {object|undefined} an unsigned EVM transaction or undefined if no approval is required". `vaultAction()` comment: "The approve endpoint responds with JSON null when no approval is required (e.g. native-token currencies). Normalize to undefined so callers can truthy-check." So native SOMI should yield `undefined`.

## Actual
For SOMI (native) the call returns the JavaScript string `"null\n"` (typeof `string`, truthy). The normalisation `if (response === null)` never fires because the endpoint body `null\n` is not parsed as JSON by the CCXT fetch layer (it only JSON-parses bodies starting with `{` or `[`), so a caller doing `const tx = await e.vaultApprove(...); if (tx) sendTransaction(tx)` tries to broadcast the string "null\n". For USDso the object `{chainId, data, to, value}` is returned correctly.

## Evidence
2026-11-02T19:1x UTC, mainnet REST (the integration has no testnet URL, see ccxt-03):
```
SOMI string "null\n"
USDso object {"chainId":"5031","data":"0x095ea7b3...","to":"0x00000022dA000002656c64D9eA6011ea952D008A","value":"0"}
```
Fix: handle the string case (`response === null || (typeof response === 'string' && response.trim() === 'null')`) or override `parseJson`/`handleRestResponse`.

## Environment
- ccxt 4.5.53, branch add-dreamdex-exchange, Node 22, https://api.dreamdex.io/v0
- Date: 2026-11-02 (UTC)
