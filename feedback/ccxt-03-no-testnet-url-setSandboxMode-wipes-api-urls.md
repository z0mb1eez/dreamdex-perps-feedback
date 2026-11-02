# CCXT dreamdex: no testnet/staging URL; setSandboxMode(true) leaves urls.api = {} and every call fails with "TypeError: Invalid URL"
Severity: normal
Area: SDK

## Steps to reproduce
1. Install the CCXT branch as in ccxt-01.
2. Run:
```js
const e = new ccxt.dreamdex({ walletAddress });
console.log(e.has.sandbox, e.urls.test, JSON.stringify(e.urls.api));  // false undefined {"rest":"https://api.dreamdex.io"}
e.setSandboxMode(true);                                                // does not throw
console.log(JSON.stringify(e.urls.api), e.isSandboxModeEnabled);       // {} true
await e.fetchMarkets();                                                // TypeError: Invalid URL
```

## Expected
Either a testnet entry in `urls.test` pointing to https://stg.api.dreamdex.io (the docs' API overview lists the Shannon testnet REST base `https://stg.api.dreamdex.io/v0`, chain 50312, and the CCXT page says nothing about testnet), or `setSandboxMode(true)` throwing the standard `NotSupported` because `has.sandbox` is false.

## Actual
The integration only knows mainnet (`https://api.dreamdex.io`, chain 5031), so a developer following the CCXT page on testnet silently talks to mainnet (createOrder returns real-chain-5031 unsigned txs). `setSandboxMode(true)` empties `urls.api` and the next request dies with an opaque `TypeError: Invalid URL`. Workaround that works: `e.urls.api.rest = 'https://stg.api.dreamdex.io'` (returns the testnet markets SOMI/WBTC/WETH vs USDSO).

## Evidence
2026-11-02T19:1x UTC output:
```
setSandboxMode ok {} true
fetchMarkets ERR TypeError Invalid URL
```
Also: CCXT symbols are upper-cased (`SOMI/USDSO`); the `SOMI/USDso` form suggested in ccxt-example item 04 is rejected with `BadSymbol: dreamdex does not have market symbol SOMI/USDso`.

## Environment
- ccxt 4.5.53, branch add-dreamdex-exchange, Node 22
- Date: 2026-11-02 (UTC)
