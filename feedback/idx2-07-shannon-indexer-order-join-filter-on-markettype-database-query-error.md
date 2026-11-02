# Shannon indexer returns "database query error" for Order queries filtered via the market relation; same query works on mainnet
Severity: normal
Area: API

## Steps to reproduce
Run on both endpoints:
`{ Order(limit:2, order_by:{placedAtTimestamp:desc}, where:{market:{marketType:{_eq:SPOT}}}){ id } }`
Also on Shannon: `{ Order(limit:1, where:{market_id:{_eq:"0x259fd6559214dd5ad3752322426ea9f9fabefff4"}, cancelReason:{_is_null:false}}){ id } }`.

## Expected
A result list (possibly empty), as on mainnet.

## Actual
https://dev.smk.somnia.host/v1/graphql returns `{"errors":[{"message":"database query error","extensions":{"path":"$","code":"unexpected"}}]}` every time (repeated twice); https://prd.smk.somnia.host/v1/graphql returns 2 rows. The same `market:{marketType:{_eq:BINARY}}` filter works on Shannon, so only the large Order table for SPOT trips it (likely a statement timeout surfaced as code `unexpected`, not a validation error). Unrelated filters on rarely-set columns (`pool`/`side`/`cancelReason` is_null:false) error on both networks. Error text gives no hint (timeout vs invalid).

## Environment
Node 22.23.4, viem 2.54.1, SHANNON indexer https://dev.smk.somnia.host/v1/graphql (chain 50312, RPC api.infra.testnet.somnia.network) and mainnet indexer https://prd.smk.somnia.host/v1/graphql (chain 5031, RPC api.infra.mainnet.somnia.network). Checked 2026-11-02 around unix 1793611400.
