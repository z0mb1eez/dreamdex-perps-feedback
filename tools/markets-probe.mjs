// Read-only probe built on @somnia-chain/markets-sdk (Somnia Tokyo/Shannon testnet).
// Loads markets via the indexer and prints symbols + a book snapshot. No key needed.
import { SomniaMarkets, SOMNIA_TESTNET_ADDRESSES } from "@somnia-chain/markets-sdk";
import { somniaShannon } from "@somnia-chain/markets-sdk/chains";

const exchange = new SomniaMarkets({
  indexerUrl: "https://dev.smk.somnia.host/v1/graphql",
  chain: somniaShannon,
  wsRpcUrl: "wss://api.infra.testnet.somnia.network/ws",
  addresses: SOMNIA_TESTNET_ADDRESSES,
});
await exchange.loadMarkets();
const symbols = Object.keys(exchange.markets ?? {});
console.log(`loaded ${symbols.length} markets`);
console.log(symbols.slice(0, 10));
process.exit(0);
