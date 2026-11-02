# dreamdex-bot-kit `NonceManager.acquire()` backpressure is racy: with maxInFlight=2, ten concurrent acquire() calls all succeed and inFlight reaches 10
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit && npm install && npm run build -w packages/core` (or use the shipped `packages/core/dist`).
2. In a separate directory save `nm.mjs` (stubbed client, no network):
```js
import { NonceManager } from "<kit>/packages/core/dist/nonce.js";
const client = { getTransactionCount: async () => 100 };
const nm = new NonceManager(client, "0x000000000000000000000000000000000000dEaD", 2); // maxInFlight = 2
await nm.initialize();
const got = await Promise.race([
  Promise.all(Array.from({ length: 10 }, () => nm.acquire())),
  new Promise(r => setTimeout(() => r("TIMEOUT: backpressure held"), 1500)),
]);
console.log("maxInFlight=2, 10 concurrent acquire() ->", got, "inFlight=", nm.inFlight);
process.exit(0);
```
3. `node nm.mjs`

## Expected
The class comment (`packages/core/src/nonce.ts`) promises "backpressure, so a stuck tx can't let unbounded sends pile up". With maxInFlight = 2 and no call to `settled()`, only two nonces should be handed out; the other eight `acquire()` calls should wait.

## Actual
```
maxInFlight=2, 10 concurrent acquire() -> [100,101,102,103,104,105,106,107,108,109] inFlight= 10
```
All ten callers got a nonce. The `while (this.inFlight >= this.maxInFlight)` check runs BEFORE the serialization queue, and `inFlight` is only incremented inside the queue, so every concurrent caller passes the check while inFlight is still below the limit. The limit only works for strictly sequential callers; a strategy that fires several orders per tick (the documented high-throughput use) is not throttled and can queue unbounded transactions behind a stuck one. Fix: re-check the limit inside the serialized section (or increment before awaiting).

## Evidence
Output above, from the kit's compiled `packages/core/dist/nonce.js`; source `packages/core/src/nonce.ts` `acquire()`.

## Environment
dreamdex-bot-kit main (packages/core TypeScript), Node 22. Pure logic, no chain access.
