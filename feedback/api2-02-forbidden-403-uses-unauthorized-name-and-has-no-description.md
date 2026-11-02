# 403 responses return name `unauthorized` with no `description`, docs list `wallet_not_allowed`
Severity: normal
Area: API

## Steps to reproduce
1. Setup: `mkdir t && cd t && npm init -y && npm pkg set type=module && npm i viem`, save `login.mjs` (below) and run `export TOKEN=$(node login.mjs)` (fresh throwaway wallet, no funds needed; the prepare endpoints only return unsigned transactions).

`login.mjs`:
```js
// login.mjs - prints a bearer token for a fresh throwaway wallet. Usage: npm i viem; TOKEN=$(node login.mjs)
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
const B = "https://stg.api.dreamdex.io/v0";
const a = privateKeyToAccount(generatePrivateKey());
const { nonce } = await (await fetch(B + "/auth/nonce")).json();
const message = `stg.api.dreamdex.io wants you to sign in with your Ethereum account:\n${a.address}\n\nSign in to dreamDEX\n\nURI: https://stg.api.dreamdex.io\nVersion: 1\nChain ID: 50312\nNonce: ${nonce}\nIssued At: ${new Date().toISOString()}`;
const signature = await a.signMessage({ message });
const r = await (await fetch(B + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, signature }) })).json();
console.log(r.token);
```

2. `curl -s -i -H "Authorization: Bearer $TOKEN" https://stg.api.dreamdex.io/v0/wallets/0x0000000000000000000000000000000000000001/balance`
3. `curl -s -i -H "Authorization: Bearer $TOKEN" https://stg.api.dreamdex.io/v0/wallets/0x0000000000000000000000000000000000000001/smart-wallets`
4. `curl -s -i -H "Authorization: Bearer $TOKEN" https://stg.api.dreamdex.io/v0/markets/SOMI:USDso/trades/0x0000000000000000000000000000000000000001`

## Expected
Error Handling page: every error has `status`, `name` and `description`; `unauthorized` is "Missing or invalid bearer token" (401) and `wallet_not_allowed` is "Wallet is not authorized (403)". Wallets page: "tokens without [wallet:read_any] receive 403".

## Actual
All three return HTTP 403 with `Error-Name: unauthorized` and a body that has no `description`: `{"name":"unauthorized","status":403}`. The documented 403 name `wallet_not_allowed` is never returned, and a client that treats `unauthorized` as "re-login" (as the docs say for 401) will loop on a scope problem that re-login cannot fix.

## Evidence
```
HTTP/2 403  error-name: unauthorized  {"name":"unauthorized","status":403}   <= /wallets/0x...01/balance
HTTP/2 403  error-name: unauthorized  {"name":"unauthorized","status":403}   <= /wallets/0x...01/smart-wallets
HTTP/2 403  error-name: unauthorized  {"name":"unauthorized","status":403}   <= /markets/SOMI:USDso/trades/0x...01
```
Same for all three on a second run. For comparison a missing token gives `401 {"description":"authentication required","name":"unauthorized","status":401}`.

## Environment
- Network: Somnia testnet (Shannon, chain 50312), spot REST staging API (no perps HTTP base is documented)
- Date: 2026-11-02 19:00-19:20 UTC, every command run twice with identical results
- Base URL: https://stg.api.dreamdex.io/v0
