# Spot rows: Order.pool/Order.side and Fill.kind/makerSide/takerSide are null (they are filled for event-contract rows)
Severity: normal
Area: API

## Steps to reproduce
`{ Order(limit:2,order_by:{placedAtTimestamp:desc},where:{market_id:{_eq:"0xa936da11b57b50a344e1293aaae5232885ea2bde"}}){id pool side isBid} Fill(limit:1,order_by:{timestamp:desc},where:{market_id:{_eq:"0xa936da11b57b50a344e1293aaae5232885ea2bde"}}){id kind makerSide takerSide takerIsBid pool} }` on https://prd.smk.somnia.host/v1/graphql (WETH:USDso). Repeat on https://dev.smk.somnia.host/v1/graphql with market_id 0x259fd6559214dd5ad3752322426ea9f9fabefff4 (SOMI:USDso), and compare with a BINARY pool (e.g. `pool:{_eq:"0x81a5de485f934409c46b2462fb1a9844107d3e00"}`).

## Expected
Columns that exist on the type carry values for spot, or are documented as binary-only.

## Actual
Spot sampled rows (latest orders/fills of mainnet WETH and Shannon SOMI, plus latest fills of Shannon WETH): `Order.pool` null, `Order.side` null (only `isBid`), `Fill.kind`, `makerSide`, `takerSide` null (only `takerIsBid`). Binary rows have `pool`, `side: SELL_YES`, `kind: DIRECT_YES|MINT_A_PAIR`, `makerSide: BUY_YES`, `takerSide: BUY_NO`. Fill.pool is populated for spot but Order.pool is not. (Sample-based: unfiltered "not null" scans on these tables fail with database query error, see the related item on query timeouts.)

## Environment
Node 22.23.4, viem 2.54.1, SHANNON indexer https://dev.smk.somnia.host/v1/graphql (chain 50312, RPC api.infra.testnet.somnia.network) and mainnet indexer https://prd.smk.somnia.host/v1/graphql (chain 5031, RPC api.infra.mainnet.somnia.network). Checked 2026-11-02 around unix 1793611400.
