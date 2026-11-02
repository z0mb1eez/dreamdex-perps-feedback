# GET /wallets/{wallet}/balance and /volume return 200 for the caller's own wallet without wallet:read_any, while trades/{address} returns 403
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

2. `W=$(node -e 'console.log(JSON.parse(Buffer.from(process.argv[1].split(".")[1],"base64url")).wallet)' $TOKEN)`
3. `curl -s -i -H "Authorization: Bearer $TOKEN" https://stg.api.dreamdex.io/v0/wallets/$W/balance`
4. `curl -s -i -H "Authorization: Bearer $TOKEN" https://stg.api.dreamdex.io/v0/wallets/$W/volume`
5. `curl -s -i -H "Authorization: Bearer $TOKEN" https://stg.api.dreamdex.io/v0/markets/SOMI:USDso/trades/$W`
6. Repeat 3 with another address, e.g. `0x0000000000000000000000000000000000000001`.

## Expected
Wallets page: "Access is restricted to bearer tokens carrying the wallet:read_any scope; tokens without it receive 403", and "to query your own account use Vault balance and Trade History". The token's JWT payload has no scope claim (`sub`, `exp`, `iat`, `wallet` only).

## Actual
A scope-less token gets 200 for its own wallet on `/wallets/{wallet}/balance` and `/volume` but 403 for any other address, and 403 for its own address on `/markets/{symbol}/trades/{address}` (same documented restriction pattern, `trades:read_any`). So the same rule is enforced differently on sibling endpoints, and the docs describe neither the self-exemption nor the behaviour of trades/{address} for the caller's own address.

## Evidence
```
HTTP/2 200 {"blockNumber":530723075,"markets":[{"base":{"currency":"SOMI","vault":"0","wallet":"0"},...   <= /wallets/0x9Ecc...ADCD/balance
HTTP/2 200 {"since":1793041868468,"until":1793646668468,"volumes":[...                                    <= /wallets/0x9Ecc...ADCD/volume
HTTP/2 403 error-name: unauthorized {"name":"unauthorized","status":403}  <= /wallets/0x0000...0001/balance
HTTP/2 403 error-name: unauthorized {"name":"unauthorized","status":403}  <= /markets/SOMI:USDso/trades/0x9Ecc...ADCD
```
Identical on a second run with a new wallet.

## Environment
- Network: Somnia testnet (Shannon, chain 50312), spot REST staging API (no perps HTTP base is documented)
- Date: 2026-11-02 19:00-19:20 UTC, every command run twice with identical results
- Base URL: https://stg.api.dreamdex.io/v0
