# SDK README / EXCHANGE.md / ENGINE.md / symbols.md quick-start symbol `BTC-95000-31DEC26/USDC#YES` does not exist on any network; the copy-paste `watchOrderBook` / `createOrder` examples throw `InvalidInputError: unknown symbol`
Severity: normal
Area: SDK

## Steps to reproduce
1. `mkdir t && cd t && npm init -y >/dev/null && npm pkg set type=module && npm i @somnia-chain/markets-sdk@0.32.1 viem`
2. Save `sym.mjs` (read-only, mainnet indexer, no key):
```js
import { SomniaMarkets, SOMNIA_MAINNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { somniaMainnet } from "@somnia-chain/markets-sdk/chains";
const ex = new SomniaMarkets({ indexerUrl: "https://prd.smk.somnia.host/v1/graphql", chain: somniaMainnet, wsRpcUrl: "wss://api.infra.mainnet.somnia.network/ws", addresses: SOMNIA_MAINNET_ADDRESSES });
await ex.loadMarkets();
console.log(ex.symbols.length, ex.symbols.filter(s => /BTC/.test(s)).slice(0, 4));
try { ex.market("BTC-95000-31DEC26/USDC#YES"); console.log("ok"); }
catch (e) { console.log(e.constructor.name, e.message.slice(0, 140)); }
```
3. `node sym.mjs`. (The README snippet adds `await exchange.watchOrderBook("BTC-95000-31DEC26/USDC#YES")` and `createOrder("BTC-95000-31DEC26/USDC#YES", ...)`; every SDK call that takes a symbol resolves it through the same lookup. The same example symbol appears in `README.md`, `docs/EXCHANGE.md` (lines 17, 38), `docs/ENGINE.md` (line 94), `docs/reference/symbols.md` and `docs/explanation/about-symbols-and-human-units.md`.)

## Expected
The first example a new integrator copies from the README resolves on the network it configures, or the docs say it is an illustrative placeholder and show how to obtain a real symbol (e.g. `exchange.symbols`).

## Actual
```
10 [ 'BTC-7805005-02NOV26-0935/USDso', 'BTC-7805005-02NOV26-0945/USDso', 'BTC-7815415-02NOV26-1000/USDso', 'WBTC/USDso' ]
InvalidInputError @somnia-chain/markets-sdk: unknown symbol BTC-95000-31DEC26/USDC#YES — call loadMarkets() first
```
Live event-contract symbols are short-window series markets: the quote is `USDso` on mainnet (`tUSDC` on testnet), the expiry carries `-HHMM`, and the strike field is a large integer (`7805005`) rather than a round number. There are no day-dated BTC markets quoted in `USDC`, so the headline README example fails even after `loadMarkets()` (the error message's own hint).

The spot examples are stale in the same way: `README.md` line 92, `docs/SPOT.md` line 3 and the `docs/EXCHANGE.md` grammar table (line 37) use `SOMI/USDC` as the spot symbol, but the only SOMI spot market is `SOMI/USDso` (mainnet list above: `SOMI/USDso`, `USDC.e/USDso`, `WBTC/USDso`, `WETH/USDso`), so `ex.market('SOMI/USDC')` also throws `unknown symbol`. `docs/EXCHANGE.md` line 44 shows the series symbol `ETH-171780-03JUL26-0930/TUSDC` while the synthesis rules (symbols.md) preserve case, which gives `tUSDC`.

## Evidence
Output above from the published 0.32.1 package, 2026-11-02, against the production indexer.

## Environment
@somnia-chain/markets-sdk 0.32.1, Node 22.23.4, viem 2.x, mainnet indexer https://prd.smk.somnia.host/v1/graphql.
