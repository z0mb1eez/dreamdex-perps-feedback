# SDK docs say PerpPosition.entryFundingIndex is not on the indexer schema, but it is served and matches chain; listPerpPositions still omits it
Severity: normal
Area: SDK

## Steps to reproduce
1. Setup: `mkdir repro && cd repro && npm init -y && npm pkg set type=module && npm i viem @somnia-chain/markets-sdk@0.32.1`
2. SDK docs: `docs/PERPS.md` ("the entry funding index is absent by design — it is not on the schema production serves, so it waits on the next reindex"), `client.listPerpPositions` JSDoc in `somniaMarketsClient.ts` ("`entryFundingIndex` is not selected — the deployed Hasura schema does not carry it yet"), and perp/state.ts ("the entry funding index is not on this row at all").
3. Run (`r4.mjs`):
```js
import { createPublicClient, http, parseAbi } from "viem"
import { SOMNIA_HIDEKI_TESTNET_ADDRESSES, SomniaMarkets } from "@somnia-chain/markets-sdk"
import { hidekiTestnet } from "@somnia-chain/markets-sdk/chains"
const IDX = "https://hideki-dev.smk.somnia.host/v1/graphql"
const pc = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") })
const btc = "0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0", mb = "0x478769E1177C0773c43A593DCCc4Ad15F15F1394", a = "0x47537e3a3ea6e9391f3b26ea45618db6828c8bff"
const gql = async q => (await (await fetch(IDX, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query: q }) })).json())
console.log("UTC", new Date().toISOString())
console.log((await gql('{__type(name:"PerpPosition"){fields{name}}}')).data.__type.fields.map(f => f.name).join(","))
console.log(JSON.stringify((await gql(`{PerpPosition(where:{id:{_eq:"${btc}_${a}"}}){size isLong entryFundingIndex updatedAtBlock}}`)).data))
const chain = await pc.readContract({ address: mb, abi: parseAbi(["function getPosition(address,address) view returns ((int128 size,uint128 avgEntryPrice,int256 entryFundingIndex,uint64 lastUpdatedTimestampNs))"]), functionName: "getPosition", args: [a, btc] })
console.log("chain entryFundingIndex", chain.entryFundingIndex.toString())
const m = new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: IDX, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES })
console.log("SDK row keys:", Object.keys((await m.client.listPerpPositions(a, { pool: btc }))[0]).join(","))
process.exit(0)
```

## Expected
Docs match the live schema, and (since the column exists) `listPerpPositions` can expose `entryFundingIndex` so funding-sensitive reads need not go to the chain per position.

## Actual
The live Hasura schema's `PerpPosition` type has `entryFundingIndex`, populated and equal to MarginBank.getPosition(...).entryFundingIndex, including for old rows (e.g. 0xd167...94F3 on the BTC pool, block 12169717: 222167282207962097625000000000000000000 on both). The documented limitation is stale; the SDK query still omits the column and the `IndexedPerpPosition` type has no such field.

## Evidence
2026-11-02T04:19:25Z (first run 2026-11-02T04:16:39Z and 04:16:44Z gave the same match):
```
PerpPosition fields: account,entryFundingIndex,entryPriceX18,id,isLong,market,market_id,pool,realizedPnl,size,updatedAt,updatedAtBlock
raw GraphQL row: {"PerpPosition":[{"size":"8693272000","isLong":false,"entryFundingIndex":"5916545682464702515140315395042282781250","updatedAtBlock":39398632}]}
chain MarginBank.getPosition entryFundingIndex: 5916545682464702515140315395042282781250
SDK client.listPerpPositions keys: id,pool,account,size,avgEntryPrice,lastUpdateRealizedPnl,updatedAt,updatedAtBlock
```

## Environment
- SDK @somnia-chain/markets-sdk 0.32.1
- Hideki testnet, chain id 50383, RPC https://api.hideki2.infra.testnet.somnia.network, indexer https://hideki-dev.smk.somnia.host/v1/graphql
- node v22.23.4, Linux, run on 2026-11-02 (UTC), read-only (no wallet, no transactions)
