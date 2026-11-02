# vault/deposit|withdraw|approve accept amount 0 and silently truncate amounts finer than the token's decimals; native approve returns 200 `null`
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

2. `B=https://stg.api.dreamdex.io/v0; H="Authorization: Bearer $TOKEN"; J='Content-Type: application/json'`
3. `curl -s -X POST -H "$H" -H "$J" -d '{"currency":"SOMI","amount":"0"}' $B/markets/SOMI:USDso/vault/deposit`
4. `curl -s -X POST -H "$H" -H "$J" -d '{"currency":"WBTC","amount":"0.000000001"}' $B/markets/WBTC:USDso/vault/deposit`   (WBTC has 8 decimals)
5. `curl -s -X POST -H "$H" -H "$J" -d '{"currency":"WBTC","amount":"0.123456789"}' $B/markets/WBTC:USDso/vault/deposit`
6. `curl -s -X POST -H "$H" -H "$J" -d '{"currency":"USDso","amount":"1.0000000000000000019"}' $B/markets/SOMI:USDso/vault/approve`   (18 decimals)
7. `curl -s -i -X POST -H "$H" -H "$J" -d '{"currency":"SOMI","amount":"1"}' $B/markets/SOMI:USDso/vault/approve`
8. For comparison `curl -s -X POST -H "$H" -H "$J" -d '{"side":"buy","type":"limit","amount":"0","price":"0.1"}' $B/markets/SOMI:USDso/orders`

## Expected
Error Handling: `invalid_amount` = "Amount is not a valid decimal or violates the market's lot size". The orders endpoint rejects `amount: "0"` with 400 invalid_amount. Vault page: "POST /v0/markets/{symbol}/vault/approve" returns an unsigned transaction to sign.

## Actual
- amount `0` returns 200 and a deposit/withdraw/approve transaction with amount 0 (orders reject the same value).
- amount finer than the token decimals is silently truncated, not rejected: `0.000000001` WBTC becomes raw `0` (a zero-value deposit), `0.123456789` becomes raw `0xbc614e` = 0.12345678, `1.0000000000000000019` USDso becomes `...0001` raw (19th decimal dropped).
- `vault/approve` for the native token SOMI returns HTTP 200 with the JSON body `null` instead of a transaction or an error (no approval is needed for native, but a client doing `tx.to` crashes on `null`).

## Evidence
```
deposit SOMI 0                -> 200 {"chainId":"50312","data":"0xdb6b5246","to":"0x259fD6...","value":"0"}
deposit WBTC 0.000000001      -> 200 {"data":"0x47e7ef24...4e85dc48...f384" + 64 zeros (amount raw 0),"to":"0x3605f28a..."}
deposit WBTC 0.123456789      -> 200 {"data":"...0000bc614e"}   (0xbc614e = 12345678)
approve USDso 1.0000000000000000019 -> 200 {"data":"0x095ea7b3...0de0b6b3a7640001"}   (raw 1000000000000000001)
approve SOMI 1                -> HTTP/2 200 content-type: application/json  body: null
orders amount 0               -> 400 invalid_amount "amount must be greater than zero"
```
Identical on a second run.

## Environment
- Network: Somnia testnet (Shannon, chain 50312), spot REST staging API (no perps HTTP base is documented)
- Date: 2026-11-02 19:00-19:20 UTC, every command run twice with identical results
- Base URL: https://stg.api.dreamdex.io/v0
