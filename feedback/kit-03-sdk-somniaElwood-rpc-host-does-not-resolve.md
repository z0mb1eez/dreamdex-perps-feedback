# SDK ships somniaElwood (chain 50313) and documents its RPC/WS host, but api.elwood.infra.testnet.somnia.network does not resolve (NXDOMAIN)
Severity: normal
Area: docs

## Steps to reproduce
1. `dig api.elwood.infra.testnet.somnia.network` (or `curl -sS https://api.elwood.infra.testnet.somnia.network`)
2. Compare with the SDK: `mkdir t && cd t && npm init -y >/dev/null && npm pkg set type=module && npm i @somnia-chain/markets-sdk@0.32.1`, then
`node -e "import('@somnia-chain/markets-sdk/chains').then(c=>console.log(c.somniaElwood.id, c.somniaElwood.rpcUrls.default))"`

## Expected
`docs/reference/networks-and-endpoints.md` lists `somniaElwood | 50313 | Somnia Elwood Testnet | https://api.elwood.infra.testnet.somnia.network | wss://api.elwood.infra.testnet.somnia.network/ws`. README and `docs/CHAINS.md` list Elwood as a supported network next to mainnet/Shannon/Hideki. A client built with this chain should be able to connect.

## Actual
The host has no DNS record, so every request through `somniaElwood` fails at name resolution. The docs give no indication that Elwood is retired or offline (the Elwood row says only "no explorer, no Multicall3"). The other three hosted networks (mainnet, Shannon, Hideki) all answer `eth_chainId` correctly.

## Evidence
2026-11-02 ~09:11 UTC:
```
$ dig api.elwood.infra.testnet.somnia.network | grep status
;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 36483
$ curl -sS -m 10 https://api.elwood.infra.testnet.somnia.network
curl: (6) Could not resolve host: api.elwood.infra.testnet.somnia.network
$ node -e "..."
50313 { http: [ 'https://api.elwood.infra.testnet.somnia.network' ], webSocket: [ 'wss://api.elwood.infra.testnet.somnia.network/ws' ] }
```
For comparison `eth_chainId` returns 0x13a7 (5031) for api.infra.mainnet, 0xc488 (50312) for api.infra.testnet and dream-rpc, 0xc4cf (50383) for api.hideki2.

## Environment
- @somnia-chain/markets-sdk 0.32.1, node v22.23.4, Linux; resolver of the test machine (NXDOMAIN reported by dig)
