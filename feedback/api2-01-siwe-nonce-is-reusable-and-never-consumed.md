# SIWE login accepts the same nonce unlimited times, across different wallets
Severity: major
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

2. Save `siwe.mjs` (below) and run `node siwe.mjs`. It fetches one nonce from `GET /v0/auth/nonce`, then logs in with it three times with wallet A and once with a different wallet B.

`siwe.mjs`:
```js
// siwe.mjs - SIWE nonce reuse / issuedAt / uri checks. Usage: npm i viem; node siwe.mjs
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
const B = "https://stg.api.dreamdex.io/v0";
const mk = (addr, nonce, o = {}) =>
  `stg.api.dreamdex.io wants you to sign in with your Ethereum account:\n${addr}\n\nSign in to dreamDEX\n\nURI: ${o.uri ?? "https://stg.api.dreamdex.io"}\nVersion: 1\nChain ID: 50312\nNonce: ${nonce}\nIssued At: ${o.iat ?? new Date().toISOString()}`;
const login = async (acct, nonce, o) => {
  const message = mk(acct.address, nonce, o);
  const signature = await acct.signMessage({ message });
  const r = await fetch(B + "/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, signature }) });
  const t = await r.text();
  return r.status + " " + t.slice(0, 70).replace(/"token":"[^"]{10}[^"]*/, '"token":"<jwt>');
};
const a = privateKeyToAccount(generatePrivateKey()), b = privateKeyToAccount(generatePrivateKey());
const { nonce } = await (await fetch(B + "/auth/nonce")).json();
console.log("nonce", nonce);
console.log("1st login, account A:", await login(a, nonce));
console.log("2nd login, account A, same nonce:", await login(a, nonce));
console.log("3rd login, account A, same nonce:", await login(a, nonce));
console.log("login, account B, same nonce:", await login(b, nonce));
const n2 = (await (await fetch(B + "/auth/nonce")).json()).nonce;
console.log("issuedAt 2020-01-01:", await login(a, n2, { iat: "2020-01-01T00:00:00.000Z" }));
console.log("issuedAt 2099-01-01:", await login(a, n2, { iat: "2099-01-01T00:00:00.000Z" }));
console.log("URI https://evil.example:", await login(a, n2, { uri: "https://evil.example" }));
```

## Expected
Authentication page: "request a nonce, include it in a SIWE message ... submit the signed message". The Error Handling page lists `invalid_nonce` ("SIWE nonce is invalid or expired"). ERC-4361 requires a nonce to be single-use so a captured signed login message cannot be replayed.

## Actual
The same nonce is accepted for every login attempt, including by a different wallet. A captured message+signature can be replayed indefinitely until the nonce expires (and each replay mints a new 1 hour JWT). The server also does not check `Issued At` (2020 and 2099 values accepted) or `URI` (an `https://evil.example` URI accepted), so there is no other replay bound.

## Evidence
```
nonce 000001a19dacc67873b5...
1st login, account A: 200 {"expiresAt":1793650308763,"token":"<jwt>
2nd login, account A, same nonce: 200 {"expiresAt":1793650309122,"token":"<jwt>
3rd login, account A, same nonce: 200 {"expiresAt":1793650309222,"token":"<jwt>
login, account B, same nonce: 200 {"expiresAt":1793650309584,"token":"<jwt>
issuedAt 2020-01-01: 200 {"expiresAt":1793650310042,"token":"<jwt>
issuedAt 2099-01-01: 200 {"expiresAt":1793650310140,"token":"<jwt>
URI https://evil.example: 200 {"expiresAt":1793650310243,"token":"<jwt>
```
Second run: identical (different nonce, all 200).

## Environment
- Network: Somnia testnet (Shannon, chain 50312), spot REST staging API (no perps HTTP base is documented)
- Date: 2026-11-02 19:00-19:20 UTC, every command run twice with identical results
- Base URL: https://stg.api.dreamdex.io/v0
