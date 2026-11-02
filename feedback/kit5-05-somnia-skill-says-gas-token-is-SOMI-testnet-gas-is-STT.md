# dreamdex-bot-kit `skills/somnia/SKILL.md` says gas is always native SOMI ("keep a SOMI balance"), but on the Shannon testnet it is STT
Severity: normal
Area: docs

## Steps to reproduce
1. Read `skills/somnia/SKILL.md` in `github.com/somnia-chain/dreamdex-bot-kit`: its Networks table lists both Mainnet (5031) and "Shannon Testnet" (50312), tells the reader to "Always develop and test on testnet first", and the gas section says "The chain's native/gas token is **SOMI** — it pays for gas… Keep a SOMI balance in any account that sends transactions."
2. Run the kit's own read-only doctor against testnet with a throwaway key:
```
cd dreamdex-bot-kit && PRIVATE_KEY=0x$(openssl rand -hex 32) NETWORK=testnet npx tsx scripts/doctor.ts
```
3. Compare with the perps testnet docs (https://app.testnet.dreamdex.io/docs/developers/perps-testnet), which list `Gas coin | STT` and say stop orders carry 0.15 STT.

## Expected
The skill distinguishes the networks: native/gas token SOMI on mainnet, STT on the testnet that the same page tells users to develop on first (and that the sentinel `0x28f3…4c00` is how the SOMI *market* base is addressed, not the testnet gas coin symbol).

## Actual
The doctor output prints `network : testnet (chain 50312)` and `gas     : 0 STT` — the kit's own `ctx.net.nativeSymbol` for testnet is STT — while the skill, which is the file AI coding assistants load to configure these bots, instructs users to fund a "SOMI balance" for every network. Someone following it on testnet will look for SOMI to pay gas (and the SOMI:USDso spot market base on testnet is a different thing from the gas coin).

## Evidence
Doctor output (2026-11-02): `network : testnet (chain 50312)`, `gas : 0 STT`; docs line `Gas coin | STT`.

## Environment
dreamdex-bot-kit v0.1.0 (main, 2026-11-02), Node 22.
