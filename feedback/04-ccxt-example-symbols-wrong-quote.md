# CCXT page examples use SOMI/USDC, but the only quote is USDso (SOMI:USDC does not exist)
Severity: normal
Area: docs

## Steps to reproduce
1. Open https://app.testnet.dreamdex.io/docs/developers/libraries/ccxt . Every example uses `'SOMI/USDC'` (fetchTicker, fetchOrderBook, fetchTrades, fetchOHLCV, createOrder, watchOrderBook, vaultApprove, fetchBalance).
2. `curl -s -i https://stg.api.dreamdex.io/v0/markets/SOMI:USDC/trades`
3. `curl -s https://stg.api.dreamdex.io/v0/markets` (symbols: SOMI:USDso, WBTC:USDso, WETH:USDso)

## Expected
Copy-pasted examples reference a market that exists. Market Data page: "The quote is always USDso", and warns that copy-pasting a placeholder returns market_not_found.

## Actual
No USDC quote exists on testnet. On mainnet the only USDC market is USDC.e:USDso, which is a base, not a quote. The REST backing for the CCXT symbol returns `market_not_found` for SOMI:USDC. The examples should use `SOMI/USDso` (CCXT form of SOMI:USDso).

## Evidence
2026-11-02T04:06:57Z:
```
GET /v0/markets/SOMI:USDC/trades
HTTP/2 404
error-name: market_not_found
{"description":"market not found: SOMI:USDC","name":"market_not_found","status":404}
```
(CCXT library itself not installed or run; the finding is the mismatch between the documented symbol and the API market list.)

## Environment
- Network: Somnia testnet (Shannon, chain 50312, spot REST staging API); this is the only HTTP API base the docs list, no perps HTTP base is documented
- Date: 2026-11-02 (UTC)
- Base URL: https://stg.api.dreamdex.io/v0
