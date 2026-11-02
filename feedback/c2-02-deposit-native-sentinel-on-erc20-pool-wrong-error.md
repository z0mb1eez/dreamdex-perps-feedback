# deposit(NATIVE_TOKEN) on a pool with no native side reverts UseDepositNative, not InvalidDepositOrWithdrawal as documented
Severity: normal
Area: contracts

## Steps to reproduce
1. Setup: `mkdir probe && cd probe && npm init -y && npm pkg set type=module && npm i viem`
2. Run `r2.mjs` (read-only `eth_call`, no funds; testnet WBTC/USDso pool `0x3605f28aA7C50e7441211e77Cb0762d49539326C` has no native side, SOMI/USDso pool `0x259fD6559214dd5aD3752322426eA9F9fABEFff4` does):
```js
import {createPublicClient,http,parseAbi,encodeFunctionData} from 'viem';
const c=createPublicClient({transport:http('https://api.infra.testnet.somnia.network')});
const abi=parseAbi(['function deposit(address,uint256)','function depositNative() payable']);
const NAT='0x28f34DeFd2b4CB48d9eE6d89f2Be4Bc601694c00', from='0x000000000000000000000000000000000000dEaD';
const pools={SOMI:'0x259fD6559214dd5aD3752322426eA9F9fABEFff4',WBTC:'0x3605f28aA7C50e7441211e77Cb0762d49539326C'};
async function t(p,n,fn,args,value){try{await c.call({account:from,to:p,data:encodeFunctionData({abi,functionName:fn,args}),value,gas:6000000n,stateOverride:[{address:from,balance:10n**24n}]});console.log(n,'OK')}catch(e){console.log(n,'REVERT',e.walk(x=>x.data)?.data)}}
for(const [k,p] of Object.entries(pools)){console.log('==',k);
 await t(p,'deposit(NATIVE_TOKEN,1)','deposit',[NAT,1n]);
 await t(p,'depositNative{value:1}','depositNative',[],1n);}
```

## Expected
Errors page: `0x890a6062 UseDepositNative()` is raised when "Called deposit(NATIVE_TOKEN, ...) on a native-side pool. Call depositNative() with msg.value instead." and `0x734b5f70 InvalidDepositOrWithdrawal()` when "Token is neither the base nor quote of the market". On a pool with no native side, NATIVE_TOKEN is neither base nor quote, so `InvalidDepositOrWithdrawal` is expected (the Functions page also says depositNative is "Only valid on pools where one side of the pair is the native token").

## Actual
```
== SOMI
deposit(NATIVE_TOKEN,1) REVERT 0x890a6062      (UseDepositNative - as documented)
depositNative{value:1} OK
== WBTC
deposit(NATIVE_TOKEN,1) REVERT 0x890a6062      (UseDepositNative - documented as native-side-pool only)
depositNative{value:1} REVERT 0x734b5f70       (InvalidDepositOrWithdrawal)
```
On the WBTC (and WETH) pools the revert tells the integrator to "call depositNative() with msg.value", and doing exactly that reverts with a different error. Same result on the WETH pool `0xD180195da5459C7a0DEA188ed61216ec43682b50`. Either the contract should return `InvalidDepositOrWithdrawal` for non-native pools or the Errors page should say `UseDepositNative` is raised for the sentinel on any pool.

## Evidence
Run 2026-11-02 ~06:10Z UTC. Same eth_call against mainnet (`https://api.infra.mainnet.somnia.network`, WBTC pool `0x25bfF6B7B5E2243424F38E75de7ab03C0522a5EA`) not run for depositNative; testnet reproduced as shown. Other deposit/withdraw reverts matched the docs: `deposit(random token)` and `withdraw(random token)` -> 0x734b5f70, zero amount -> 0x2c5211c6 InvalidAmount, `withdraw(USDso,1)` with empty vault -> 0xcf479181 InsufficientBalance(0,1).

## Environment
Somnia Shannon testnet (chain 50312), public RPC, Node 22.23.4, viem 2.x.
