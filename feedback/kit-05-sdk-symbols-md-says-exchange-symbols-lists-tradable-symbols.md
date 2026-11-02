# symbols.md says `exchange.symbols` lists every tradable symbol; it contains only market symbols (no `#YES`/`#NO`)
Severity: normal
Area: docs

## Steps to reproduce
1. `mkdir t && cd t && npm init -y >/dev/null && npm pkg set type=module && npm i @somnia-chain/markets-sdk@0.32.1`
2. Save `sym.mjs`:
```js
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from '@somnia-chain/markets-sdk';
import { somniaShannon } from '@somnia-chain/markets-sdk/chains';
const ex = new SomniaMarkets({ indexerUrl: 'https://dev.smk.somnia.host/v1/graphql', chain: somniaShannon, addresses: SOMNIA_TESTNET_ADDRESSES });
await ex.loadMarkets();
const mk = Object.keys(ex.markets);
console.log('symbols', ex.symbols.length, 'markets', mk.length, 'with #', ex.symbols.filter(s => s.includes('#')).length);
const b = mk.find(s => ex.markets[s].type === 'binary');
console.log('binary market symbol', b, '| in symbols?', ex.symbols.includes(b), '| YES tradable in symbols?', ex.symbols.includes(b + '#YES'));
console.log('market(b+"#YES").symbol =', ex.market(b + '#YES').symbol);
await ex.close(); process.exit(0);
```
3. `node sym.mjs`

## Expected
`docs/reference/symbols.md`: "A tradable symbol names something an order can be placed on" and for binaries the tradable symbols are `...#YES` / `...#NO`; later: "`exchange.symbols` lists every tradable symbol. `exchange.markets` maps market symbols to `UnifiedMarket` rows." So `exchange.symbols` should contain `<binary>#YES` and `<binary>#NO`.

## Actual
`exchange.symbols` is exactly `Object.keys(exchange.markets).sort()` (src/unified/exchange.ts line 1691): market symbols only, 0 entries with `#`. `ex.market(sym + '#YES')` does resolve, so the tradable symbols are valid, but they are not enumerable from `exchange.symbols`. The TSDoc on the field itself says "All market symbols (populated by loadMarkets)", contradicting the docs page. Code that iterates `exchange.symbols` to find tradable binary sides finds none.

## Evidence
2026-11-02 ~09:20 UTC:
```
symbols 49 markets 49 with # 0
binary market symbol BTC-7818475-02NOV26-0917/tUSDC | in symbols? true | YES tradable in symbols? false
market(b+"#YES").symbol = BTC-7818475-02NOV26-0917/tUSDC#YES
```

## Environment
- @somnia-chain/markets-sdk 0.32.1, node v22.23.4, Linux, Shannon testnet indexer https://dev.smk.somnia.host/v1/graphql; read-only
