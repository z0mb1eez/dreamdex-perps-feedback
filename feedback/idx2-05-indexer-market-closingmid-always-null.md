# Market.closingMid is null on all but one event-contract market on both networks
Severity: normal
Area: API

## Steps to reproduce
`{ all:Market_aggregate(where:{marketType:{_eq:BINARY}}){aggregate{count}} nul:Market_aggregate(where:{marketType:{_eq:BINARY},closingMid:{_is_null:true}}){aggregate{count}} }` on https://dev.smk.somnia.host/v1/graphql and https://prd.smk.somnia.host/v1/graphql. Also select `closingCaptureState` for any finalized market.

## Expected
`closingMid` (and `closingCaptureState`) hold the captured closing midpoint for markets that traded (Shannon has 25457 BINARY markets with tradeCount > 0, mainnet 7007) or are documented as unused.

## Actual
Shannon: `closingMid` null on 237288 of 237288 BINARY markets; mainnet: null on 59316 of 59316 (counts drift by a few as markets are created). Market 0x...39ee1 (finalized, resolved) returns `closingCaptureState: null` too. The column exists in the schema (type numeric) but is never populated.

## Environment
Node 22.23.4, viem 2.54.1, SHANNON indexer https://dev.smk.somnia.host/v1/graphql (chain 50312, RPC api.infra.testnet.somnia.network) and mainnet indexer https://prd.smk.somnia.host/v1/graphql (chain 5031, RPC api.infra.mainnet.somnia.network). Checked 2026-11-02 around unix 1793611400.
