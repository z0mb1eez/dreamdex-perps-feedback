# dreamdex-bot-kit `DreamDexWs.close()` is undone if called while a reconnect is pending: the backoff timer calls connect(), which resets `closed = false` and reopens the socket
Severity: normal
Area: SDK

## Steps to reproduce
1. `git clone https://github.com/somnia-chain/dreamdex-bot-kit && cd dreamdex-bot-kit && npm install && npm run build -w packages/core` (or use the shipped `packages/core/dist`).
2. In a separate directory (with `ws` installed) save `wsr.mjs`. It runs a local WebSocket server that drops the first connection, then calls `close()` while the client is in its reconnect backoff:
```js
import { WebSocketServer } from "ws";
import { DreamDexWs } from "<kit>/packages/core/dist/ws.js";
const wss = new WebSocketServer({ port: 18765 });
let conns = 0;
wss.on("connection", (s) => { conns++; console.log("server: connection #" + conns); if (conns === 1) setTimeout(() => s.terminate(), 200); });
const c = new DreamDexWs({ wsUrl: "ws://127.0.0.1:18765" }, () => {});
c.connect();
setTimeout(() => { console.log("client.close() called during reconnect backoff"); c.close(); }, 500);
setTimeout(() => { console.log("total server connections after close():", conns); process.exit(0); }, 4000);
```
3. `node wsr.mjs`

## Expected
After `close()` the client never opens another connection (`closed = true` is meant to stop reconnects).

## Actual
```
server: connection #1
client.close() called during reconnect backoff
server: connection #2
total server connections after close(): 2
```
`scheduleReconnect()` (`packages/core/src/ws.ts`) schedules `setTimeout(() => this.connect(), delay)` and keeps no handle to it. `close()` sets `closed = true` and closes the current socket, but the pending timer still fires and `connect()` begins with `this.closed = false`, so the "closed" client reconnects, replays its subscriptions and keeps running (and keeps a 30 s heartbeat interval alive), which stops a bot's process from exiting cleanly on shutdown. Fix: store the timer id and clear it in `close()`, and do not reset `closed` inside `connect()` when invoked from the reconnect path.

## Evidence
Output above, from the kit's compiled `packages/core/dist/ws.js` against a local server (no dreamDEX endpoint involved).

## Environment
dreamdex-bot-kit main (packages/core TypeScript), Node 22, ws 8.
