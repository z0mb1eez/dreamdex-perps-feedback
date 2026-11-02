# DELETE /orders/{id} and PATCH /orders/{id}/reduce return 200 transactions for non-existent, closed and other users' orders; reduce ignores minQuantity
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

2. Run, with `B=https://stg.api.dreamdex.io/v0 H="Authorization: Bearer $TOKEN"`:
   - `curl -s -i -X DELETE -H "$H" $B/markets/SOMI:USDso/orders/1`
   - `curl -s -i -H "$H" $B/markets/SOMI:USDso/orders/1`
   - `curl -s -i -X DELETE -H "$H" $B/markets/SOMI:USDso/orders/627189298506151439734` (a filled order that belongs to another wallet; take any id from `GET /v0/markets/SOMI:USDso/trades`)
   - `curl -s -i -X PATCH -H "$H" -H 'Content-Type: application/json' -d '{"newQuantityRemaining":"0"}' $B/markets/SOMI:USDso/orders/1/reduce`
   - same with `"0.5"` and `"2000"`

## Expected
Error Handling page: `order_not_found` (404) "Order ID does not exist". Trading page for reduce: "newQuantityRemaining must be at or below the current remaining quantity, at least minQuantity, and a multiple of lotSize" (SOMI:USDso minQuantity = 1, lotSize 0.01).

## Actual
- `GET /orders/1` correctly returns 404 `order_not_found`, but `DELETE /orders/1` returns 200 with an unsigned cancel transaction for the same non-existent order.
- DELETE on a closed order owned by someone else also returns 200 and a cancel transaction (the endpoint neither checks existence, state nor ownership).
- `PATCH .../reduce` with `newQuantityRemaining` of `0` and `0.5` (below minQuantity 1) and `2000` (above any remaining) all return 200 with an unsigned transaction. Only the lot-size rule is enforced (`1.001` gives 400 invalid_amount). The user only learns of the problem after paying gas for a reverted transaction.

## Evidence
```
DELETE /orders/1                      HTTP/2 200 {"chainId":"50312","data":"0xdbc91396...01","to":"0x259fD6559214dd5aD3752322426eA9F9fABEFff4","value":"0"}
GET    /orders/1                      HTTP/2 404 error-name: order_not_found {"description":"Order not found",...}
DELETE /orders/627189298506151439734  HTTP/2 200 {"chainId":"50312","data":"0xdbc91396...01972d76",...}
PATCH  /orders/1/reduce {"newQuantityRemaining":"0"}    HTTP/2 200 {"data":"0x33407b60...0001000...0000",...}
PATCH  /orders/1/reduce {"newQuantityRemaining":"0.5"}  HTTP/2 200 {"data":"0x33407b60...06f05b59d3b20000",...}
PATCH  /orders/1/reduce {"newQuantityRemaining":"2000"} HTTP/2 200 {"data":"0x33407b60...6c6b935b8bbd400000",...}
PATCH  /orders/1/reduce {"newQuantityRemaining":"1.001"} HTTP/2 400 invalid_amount "quantity must be a multiple of lot size 0.01"
```
Identical on a second run.

## Environment
- Network: Somnia testnet (Shannon, chain 50312), spot REST staging API (no perps HTTP base is documented)
- Date: 2026-11-02 19:00-19:20 UTC, every command run twice with identical results
- Base URL: https://stg.api.dreamdex.io/v0
