# Perps app: confirming a market order with an empty gas key silently does nothing (no error, no toast, no position)
Severity: normal
Area: app

## Steps to reproduce
1. On https://app.testnet.dreamdex.io sign in with a fresh wallet and join the Perps Arena (the weekly 1,000 paper USDso voucher lands in Wallet 1's perps margin; the 20 STT gas airdrop had not arrived ~30 min later).
2. Open `/trade/perps/tokyo/BTC-PERP`, choose Short, size 200 USDso, click "Short BTC", then "Short BTC" in the "Confirm order" dialog.
3. Open the wallet menu: "This app's key is nearly out of gas ... 0.00 STT left" (banner is only visible inside the wallet panel).

## Expected
Either the order is sent (a relayer / the app key / the login wallet pays gas as the Gas panel says) or the UI shows an explicit failure ("Not enough STT to pay gas, top up 0x40E7...1729"). The order form itself shows "Insufficient funds" only for margin.

## Actual
The Confirm dialog closes, no toast or error is shown, `Positions (0)`, `Open orders (0)`, `Trade history (0)`; margin stays 1,000.00. The user cannot tell whether the order failed, is pending, or needs gas. Repeating the click gives the same result. After the account/app key received 1 STT from the Tokyo faucet (explorer.testnet.somnia.network/tokyo/faucet) the identical order filled immediately (Short 0.00262 BTC, entry 76,807.6, mark 76,645.1).

## Evidence
2026-11-02 ~19:2x UTC. Before gas: `Gas / Paid by this app's key / This app's key is nearly out of gas. 0.00 STT left` while the order button was enabled. After 1 STT: position row `BTC-PERP Perpetual · 20× Short 0.00262 ... ENTRY 76,807.6 MARK 76,645.1 ... PNL +0.43 (+4.2%)`.

## Environment
- App: https://app.testnet.dreamdex.io (Tokyo testnet, chain 50383), Chromium (Playwright), wallet 0x5A61944cF5F6b3FDbAbDBcF6ECC29c102E09dBAc (account of sign-up wallet 0x6946C74BE91A14EC574Fd26Cb3fAcC885ced7C34)
- Date: 2026-11-02 (UTC)
