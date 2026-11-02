# Specifications page "Default configuration" for the Stop Order Registry (0.1 SOMI, gasBufferBps 5000) does not match the deployed registries (0.5 SOMI, 3000)
Severity: normal
Area: docs

## Steps to reproduce
1. Setup: `mkdir probe && cd probe && npm init -y && npm pkg set type=module && npm i viem`
2. Read the page `https://app.testnet.dreamdex.io/docs/developers/contracts/contract-specifications`, section "Default configuration" under "Stop Order Registries": `somiPaymentPerOrder 0.1 SOMI - exact payment required when creating a pending stop order` and `gasBufferBps 5000 (50%)`.
3. Run `r1.mjs` (testnet SOMI/USDso registry `0xEb97349Aa62A68507c0bE535eD88B0d028a47E1e`, taken from the Addresses page):
```js
import {createPublicClient,http,parseAbi,encodeFunctionData} from 'viem';
const c=createPublicClient({transport:http('https://api.infra.testnet.somnia.network')});
const reg='0xEb97349Aa62A68507c0bE535eD88B0d028a47E1e';
const g=parseAbi(['function somiPaymentPerOrder() view returns (uint256)','function gasBufferBps() view returns (uint256)']);
console.log('somiPaymentPerOrder',await c.readContract({address:reg,abi:g,functionName:'somiPaymentPerOrder'}));
console.log('gasBufferBps',await c.readContract({address:reg,abi:g,functionName:'gasBufferBps'}));
const abi=parseAbi(['function createPendingOrder(((bool,address,uint64,uint256),uint8,uint256,uint8,uint256,address,uint96)) payable returns (uint128)']);
const from='0x000000000000000000000000000000000000dEaD';
const o=[[true,from,0n,10n**18n],1,300000000000000000n,0,0n,'0x0000000000000000000000000000000000000000',0n]; // MARKET, GTE
for(const [l,v] of [['0.1 SOMI (docs)',10n**17n],['0.5 SOMI (getter)',5n*10n**17n]]){
 try{await c.call({account:from,to:reg,data:encodeFunctionData({abi,functionName:'createPendingOrder',args:[o]}),value:v,gas:6000000n,stateOverride:[{address:from,balance:10n**24n}]});console.log(l,'OK')}catch(e){console.log(l,'revert',e.walk(x=>x.data)?.data)}}
```
4. Repeat against mainnet (`https://api.infra.mainnet.somnia.network`, registry `0x68c8f6fb1EA19A28F25358Ff00b8Ed8E1216df30`): same getter values. (Read-only eth_call, no funds; the sender balance is only a state override.)

## Expected
Per the Specifications page the defaults are `somiPaymentPerOrder = 0.1 SOMI` and `gasBufferBps = 5000`, and `createPendingOrder` "requires an exact SOMI payment matching somiPaymentPerOrder()".

## Actual
```
somiPaymentPerOrder 500000000000000000n      (0.5 SOMI)
gasBufferBps 3000n
0.1 SOMI (docs) revert 0xfa0d8bfd            (InsufficientSomiPayment(), documented on the Errors page)
0.5 SOMI (getter) revert 0x14ecd6c7          (InsufficientVaultBalance(): payment check passed, next check failed)
```
All 3 testnet registries and all 4 mainnet registries return 0.5 SOMI / 3000 (`slippageToleranceBps` 500 and `minStopDistanceBps` 0 do match). A reader who hard-codes the documented 0.1 SOMI gets `InsufficientSomiPayment()`. The page does say values are admin-tunable and to read the getters, but the table is presented as the current default and is wrong on both networks. (Related, informational: the same page documents `gasBuffer = subscriptionGasLimit x gasBufferBps / 10_000`; live 50,000,000 x 3000 / 10,000 = 15,000,000 testnet, which is consistent, so only the quoted default is stale.)

## Evidence
Run 2026-11-02 ~06:00Z UTC. Mainnet registries tested: SOMI 0x68c8f6fb..., USDC.e 0xD53E3F3b..., WBTC 0xed32F048..., WETH 0x9653a735... all `somiPaymentPerOrder = 500000000000000000`, `gasBufferBps = 3000`. Selector 0xfa0d8bfd = `InsufficientSomiPayment()` (per Errors page); 0x14ecd6c7 = `InsufficientVaultBalance()` (4byte.directory, also listed on the Errors page).

## Environment
Somnia Shannon testnet (chain 50312) and mainnet (5031) public RPCs, Node 22.23.4, viem 2.x.
