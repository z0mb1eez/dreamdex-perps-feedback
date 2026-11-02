# Default (wallet-funded) placeOrder without approval reverts with OpenZeppelin ERC20InsufficientAllowance, which neither the Errors nor Functions pages document
Severity: normal
Area: docs

## Steps to reproduce
1. Setup: `mkdir probe && cd probe && npm init -y && npm pkg set type=module && npm i viem`
2. Run `r3.mjs` (read-only eth_call; WBTC/USDso testnet pool `0x3605f28aA7C50e7441211e77Cb0762d49539326C`, default auto-pull mode, a sender that never approved the pool):
```js
import {createPublicClient,http,encodeFunctionData,parseAbi} from 'viem';
const c=createPublicClient({transport:http('https://api.infra.testnet.somnia.network')});
const pool='0x3605f28aA7C50e7441211e77Cb0762d49539326C';
const abi=parseAbi(['function placeOrder(bool,uint64,uint256,uint256,uint64,uint8,uint8,address,uint96) payable returns (bool,uint128)']);
const from='0x000000000000000000000000000000000000dEaD';
const exp=BigInt(Date.now())*1000000n+600n*1000000000n;
const data=encodeFunctionData({abi,functionName:'placeOrder',args:[true,0n,100000000000000000n*1000n,10000n,exp,0,0,'0x0000000000000000000000000000000000000000',0n]});
try{await c.call({account:from,to:pool,data})}catch(e){console.log('REVERT',e.walk(x=>x.data)?.data)}
```
3. Search the Errors page (`/docs/developers/contracts/errors`) and Functions page for `0xfb8f41b2` / `ERC20InsufficientAllowance`.

## Expected
The Functions page says placeOrder "pulls the worst-case principal + fees straight from your wallet - ERC-20 transferFrom (approve the pool once per input token)". The Errors page presents `InsufficientBalance(uint256,uint256)` `0xcf479181` as one of the "two selectors reported most often during preflight" and lists 49 selectors as the revert catalogue, so an integrator would expect the not-approved / not-funded case of the default flow to be decodable from that list.

## Actual
```
REVERT 0xfb8f41b2
000000000000000000000000 3605f28aa7c50e7441211e77cb0762d49539326c   spender = the pool
0000...0000                                                           allowance = 0
0000...0000 2710                                                      needed = 10000
```
`0xfb8f41b2` = `ERC20InsufficientAllowance(address spender,uint256 allowance,uint256 needed)` (OZ v5). It is not on the Errors page (0 occurrences of `fb8f41b2`, `ERC20InsufficientAllowance`, `ERC20InsufficientBalance`, or the word "allowance"). `InsufficientBalance` (0xcf479181) only appears in vault mode. Nothing in the docs tells a wallet-mode integrator that the first thing to fail will be a token-level OZ error. Same for native ask with wrong `msg.value`: `0x1f89f671 InvalidMsgValue(0.. , ..)` is documented and does behave correctly (checked: no value -> InvalidMsgValue(1e18, 0); exact value -> OK).

## Evidence
Run 2026-11-02 ~06:15Z UTC. Raw return data: `0xfb8f41b2000000000000000000000000...259fd...` for the SOMI pool bid with no value; for WBTC as above. Other order validation reverts reproduced as documented: past/zero expiry -> `0x3154078e OrderAlreadyExpired()`, off-tick price -> `0xaf608abb InvalidPrice(price,tickSize)`, below-min qty -> `0xeaa68ceb QuantityBelowMinimum(qty,min)`.

## Environment
Somnia Shannon testnet (chain 50312), public RPC, Node 22.23.4, viem 2.x.
