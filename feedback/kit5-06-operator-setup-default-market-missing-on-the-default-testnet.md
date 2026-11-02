# dreamdex-bot-kit `scripts/operator-setup.ts` defaults to `OP_SYMBOL=USDC.e:USDso`, which does not exist on testnet — the network the kit's `.env.example` and docs tell users to start on
Severity: normal
Area: SDK

## Steps to reproduce
1. Clone `github.com/somnia-chain/dreamdex-bot-kit`, `npm install`, and keep the shipped default `NETWORK=testnet` (`.env.example`: "Start on testnet").
2. Follow `docs/session-keys.md` "Setup (once, with the fund key)" but with a fresh key, without overriding `OP_SYMBOL` (the script's documented default; the doc example sets `OP_SYMBOL=USDC.e:USDso` and never mentions `NETWORK`):
```
cd dreamdex-bot-kit
PRIVATE_KEY=0x$(openssl rand -hex 32) OPERATOR_ADDRESS=0x0000000000000000000000000000000000000001 NETWORK=testnet npx tsx scripts/operator-setup.ts
```

## Expected
The session-key setup works on the kit's recommended starting network, or the docs say it is mainnet-only (real funds), or the default symbol is one that exists on the selected network (testnet lists `SOMI:USDso`, `WBTC:USDso`, `WETH:USDso`).

## Actual
```
Error: Unknown market "USDC.e:USDso" on testnet.
```
`scripts/operator-setup.ts` hard-codes `process.env.OP_SYMBOL ?? "USDC.e:USDso"`; the testnet market table has no such market (`curl https://stg.api.dreamdex.io/v0/markets` → SOMI/WBTC/WETH only). `docs/session-keys.md` also ends with "Verified live on Somnia mainnet" and shows the `USDC.e:USDso` example without saying that split-key trading therefore cannot be rehearsed with the shipped defaults. A user can only discover the right `OP_SYMBOL` from the error. (Related minor: with `OP_SYMBOL=SOMI:USDso OP_DEPOSIT_USDSO=0.0000001` the script does `parseUnits(String(1e-7))` = `parseUnits("1e-7")` and crashes with viem's generic "Missing or invalid parameters" after having already sent the `setManualVaultMode` transaction.)

## Evidence
Observed output above, 2026-11-02.

## Environment
dreamdex-bot-kit v0.1.0 (main, 2026-11-02), Node 22, tsx.
