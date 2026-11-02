# liquidationEngineReadAbi declares getLiquidationVolumeForBlock(uint256), which the deployed LiquidationEngine does not implement
Severity: normal
Area: contracts

## Steps to reproduce
1. Setup: `mkdir repro && cd repro && npm init -y && npm pkg set type=module && npm i viem @somnia-chain/markets-sdk@0.32.1`
2. Run (`r2.mjs`):
```js
import { createPublicClient, http, parseAbi, toFunctionSelector } from "viem"
// copied verbatim from the SDK: src/readsAbi.ts lines 553-554 (liquidationEngineReadAbi; not exported from the package entry point)
const abi = parseAbi(["function getMaxLiquidationVolumePerBlock() view returns (uint256)", "function getLiquidationVolumeForBlock(uint256 blockNumber) view returns (uint256)"])
const pc = createPublicClient({ transport: http("https://api.hideki2.infra.testnet.somnia.network") })
const address = "0xA66d3C24Ad4a389d863846905D8173e1017e9F4D" // LiquidationEngine (dev docs / getPerpSystemConfig)
console.log("UTC", new Date().toISOString())
console.log("getMaxLiquidationVolumePerBlock", await pc.readContract({ address, abi, functionName: "getMaxLiquidationVolumePerBlock" }))
try { await pc.readContract({ address, abi, functionName: "getLiquidationVolumeForBlock", args: [await pc.getBlockNumber()] }) }
catch (e) { console.log("getLiquidationVolumeForBlock ->", e.shortMessage, "|", e.details) }
// bytecode check on the EIP-1967 implementation
const slot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc"
const impl = "0x" + (await pc.getStorageAt({ address, slot })).slice(26)
const code = await pc.getCode({ address: impl })
for (const n of ["getLiquidationVolumeForBlock", "getMaxLiquidationVolumePerBlock"])
  console.log(n, toFunctionSelector(abi.find(x => x.name === n)), "in impl bytecode:", code.includes(toFunctionSelector(abi.find(x => x.name === n)).slice(2)))
process.exit(0)
```

## Expected
Every function in the SDK's liquidationEngineReadAbi exists on the deployed engine (readsAbi.ts claims these are the engine's configured bounds).

## Actual
The call reverts with empty data and the selector 0x7ed071c7 is absent from the implementation bytecode (0xf46c4966f2f17703b39e1208f98cd3dc80e4702d). As a cross-check, every function selector of perpPoolReadAbi+perpPoolWriteAbi (28, BTC pool beacon implementation), marginBankReadAbi+marginBankWriteAbi (39), perpPoolFactoryReadAbi (10), voucherDistributorReadAbi+WriteAbi (5), insuranceFundReadAbi (5) and perpStopRegistryWriteAbi (10) is present in the deployed bytecode, so this is the single drift found; all perp event ABIs (perpPoolEventsAbi, marginBankEventsAbi, liquidationEngineEventsAbi) also match deployed topic0 values. The function is not called anywhere in the SDK today and the ABI constant is internal (src/readsAbi.ts, used by perp/system.ts and perp/adl.ts), so this is a declared-but-nonexistent function in the SDK's ABI rather than a user-visible failure; it would break the first read that uses it.

## Evidence
2026-11-02T04:18:59Z (second run 04:19:02Z, same):
```
getMaxLiquidationVolumePerBlock 100000000000000000000000n
selector getLiquidationVolumeForBlock 0x7ed071c7
getLiquidationVolumeForBlock -> The contract function "getLiquidationVolumeForBlock" reverted. | execution reverted
EIP1967 impl 0xf46c4966f2f17703b39e1208f98cd3dc80e4702d selector bytes present in impl bytecode: false | getMaxLiquidationVolumePerBlock present: true
```
First observed 2026-11-02T04:13:34Z with the same revert (raw eth_call data 0x7ed071c7...01 -> {"code":3,"message":"execution reverted","data":"0x"} at 04:12:52Z).

## Environment
- SDK @somnia-chain/markets-sdk 0.32.1
- Hideki testnet, chain id 50383, RPC https://api.hideki2.infra.testnet.somnia.network, indexer https://hideki-dev.smk.somnia.host/v1/graphql
- node v22.23.4, Linux, run on 2026-11-02 (UTC), read-only (no wallet, no transactions)
