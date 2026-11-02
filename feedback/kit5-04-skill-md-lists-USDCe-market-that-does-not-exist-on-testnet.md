# dreamdex-bot-kit `skills/dreamdex-bot/SKILL.md` tells users to start on NETWORK=testnet and lists `USDC.e:USDso` as a loadable market, but the testnet has no such market
Severity: normal
Area: docs

## Steps to reproduce
1. Open `skills/dreamdex-bot/SKILL.md` in `github.com/somnia-chain/dreamdex-bot-kit`. Setup says "keep NETWORK=testnet to start"; the Core API example says `Pool.load(ctx, "SOMI:USDso") // markets: SOMI:USDso, WETH:USDso, WBTC:USDso, USDC.e:USDso`.
2. List the testnet spot markets from the testnet API the kit itself uses (`scripts/order-history.ts`: `https://stg.api.dreamdex.io/v0`):
```
curl -s https://stg.api.dreamdex.io/v0/markets | python3 -c "import sys,json;print([m['symbol'] for m in json.load(sys.stdin)['markets']])"
```

## Expected
The list of markets in the example matches the network the same page tells the reader to use (or says which markets are mainnet-only).

## Actual
Output: `['SOMI:USDso', 'WBTC:USDso', 'WETH:USDso']` — no `USDC.e:USDso`. This matches the API docs ("Testnet (Shannon, 50312): SOMI:USDso, WBTC:USDso, WETH:USDso; Mainnet: … USDC.e:USDso"). A user following the skill on testnet who tries `Pool.load(ctx, "USDC.e:USDso")` gets a not-found failure. The README's `order-history.ts` example using `USDC.e:USDso` works only because that script defaults to mainnet, which is also not stated.

## Evidence
Command output above, run 2026-11-02; docs page: https://app.testnet.dreamdex.io/docs/developers (market-data, "Symbols" table).

## Environment
dreamdex-bot-kit v0.1.0 (main, 2026-11-02), testnet API `stg.api.dreamdex.io/v0`.
