# Error names `invalid_order_id`, `invalid_order_type`, `invalid_fund_source` are documented but never returned; `chain_id_mismatch` is returned but undocumented
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
3. `curl -s -i -H "$H" $B/markets/SOMI:USDso/orders/abc`
4. `curl -s -i -X POST -H "$H" -H "$J" -d '{"side":"buy","type":"limit","amount":"1","price":"0.1","orderType":"x"}' $B/markets/SOMI:USDso/orders`
5. `curl -s -i -X POST -H "$H" -H "$J" -d '{"side":"buy","type":"limit","amount":"1","price":"0.1","fundingSource":"x"}' $B/markets/SOMI:USDso/orders`
6. `curl -s -i -X POST -H "$H" -H "$J" -d '{"side":"buy","type":"limit","amount":"1","price":"0.1","fundingSource":"marginBank"}' $B/markets/SOMI:USDso/orders`
7. Log in (login.mjs flow) with `Chain ID: 1` in the SIWE message.

## Expected
Error Handling page table: `invalid_order_id` "Order ID is not a valid format", `invalid_order_type` "Unknown or unsupported order type", `invalid_fund_source` "Funding source is incompatible with the chosen order type". The authentication errors are listed as `invalid_nonce`, `invalid_signature`, `domain_mismatch`, `wallet_not_allowed`. The Vault page documents `fundingSource` as `wallet` or `vault`.

## Actual
- Bad order id -> `invalid_param` (not `invalid_order_id`).
- Unknown `orderType` and unknown `fundingSource` -> `invalid_request_body` with the OpenAPI schema dump (not `invalid_order_type` / `invalid_fund_source`). The dump shows the schema enum is `["wallet","vault","marginBank"]` - `marginBank` is a perps-only value that is not documented on the HTTP pages and is rejected on spot with `invalid_param` "funding source \"marginBank\" is not valid on spot markets".
- A wrong SIWE chain id returns `chain_id_mismatch` (401), a name that does not appear in the Error Handling table (the Authentication page tells integrators to match the chain id, but the error list has no entry for it).
- Clients doing programmatic handling on `name` (which the page calls "stable and intended for programmatic error handling") cannot rely on the table.

## Evidence
```
GET  /orders/abc                      400 error-name: invalid_param
POST orders orderType=x               400 error-name: invalid_request_body  "value is not one of the allowed values [\"normalOrder\",\"fillOrKill\",\"immediateOrCancel\",\"postOnly\"]"
POST orders fundingSource=x           400 error-name: invalid_request_body  "value is not one of the allowed values [\"wallet\",\"vault\",\"marginBank\"]"
POST orders fundingSource=marginBank  400 error-name: invalid_param  funding source "marginBank" is not valid on spot markets
POST /auth/login Chain ID: 1          401 chain_id_mismatch {"description":"chain ID in message does not match this network"}
```
Identical on a second run.

## Environment
- Network: Somnia testnet (Shannon, chain 50312), spot REST staging API (no perps HTTP base is documented)
- Date: 2026-11-02 19:00-19:20 UTC, every command run twice with identical results
- Base URL: https://stg.api.dreamdex.io/v0
