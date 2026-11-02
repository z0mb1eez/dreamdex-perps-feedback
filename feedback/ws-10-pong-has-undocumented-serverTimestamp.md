# WebSocket `pong` carries an undocumented `serverTimestamp` field; the docs define the pong message as `operation` only
Severity: normal
Area: docs

## Steps to reproduce
1. `mkdir t && cd t && npm init -y >/dev/null && npm pkg set type=module && npm i ws`
2. Save `wsp.mjs`:
```js
import WebSocket from "ws";
const ws = new WebSocket("wss://stg.api.dreamdex.io/v0/ws/public");
ws.on("open", () => ws.send(JSON.stringify({ operation: "ping" })));
ws.on("message", d => { console.log("resp:", d.toString()); ws.close(); process.exit(0); });
setTimeout(() => { console.log("no response in 5s"); process.exit(0); }, 5000);
```
3. `node wsp.mjs` (same on `wss://api.dreamdex.io/v0/ws/public`).

## Expected
The WebSocket docs (Real-Time Feed, "Server Messages" > `pong`) list one field for the message: `operation` = `"pong"`. Docs for `ping` state "Send `{"operation": "ping"}` to receive `{"operation": "pong"}`."

## Actual
```
resp: {"operation":"pong","serverTimestamp":1793611687063}
```
The response contains an extra `serverTimestamp` (Unix milliseconds) that is not in the message-format table or in the examples on the Real-Time Feed, Operations or WebSocket overview pages (`grep -c serverTimestamp` over those pages returns 0). Clients written strictly to the documented schema may reject the frame, and the field is useful (clock-skew and latency measurement) but not discoverable.

## Evidence
Output above, captured 2026-11-02 against stg.api.dreamdex.io.

## Environment
Node 22, ws 8; stg.api.dreamdex.io/v0/ws/public.
