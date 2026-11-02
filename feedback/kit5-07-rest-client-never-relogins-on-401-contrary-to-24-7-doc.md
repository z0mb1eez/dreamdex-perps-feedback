# dreamdex-bot-kit `DreamDexRest` never re-logs in after a 401/403; every private call keeps failing until the cached token's own expiry (up to 1 hour)
Severity: normal
Area: SDK

## Steps to reproduce
1. In a clone of `github.com/somnia-chain/dreamdex-bot-kit` (deps installed), read `docs/24-7-operations.md` → "Auth: keep the JWT fresh": "Refresh a few minutes early … **Re-login on a `401`/`403` as a fallback.** Core: `DreamDexRest.ensureAuth()` refreshes 3 minutes before `expiresAt`."
2. Save `t.mts` — it stubs `fetch` so the server invalidates the first token early (restart, key rotation, clock skew) and accepts a freshly issued second token:
```ts
import { DreamDexRest } from "<kit>/packages/core/src/rest.ts";
import { privateKeyToAccount } from "viem/accounts";
let logins = 0;
(globalThis as any).fetch = async (url: string, init: any) => {
  const u = String(url); const J = (o: any, s = 200) => new Response(JSON.stringify(o), { status: s });
  if (u.endsWith("/auth/nonce")) return J({ nonce: "abc12345" });
  if (u.endsWith("/auth/login")) { logins++; return J({ token: "tok" + logins, expiresAt: Date.now() + 3600e3 }); }
  return init.headers.Authorization === "Bearer tok2" ? J({ to: "0x1" }) : J({ name: "unauthorized" }, 401);
};
const r = new DreamDexRest({ restApi: "https://x.test/v0", chainId: 50312 } as any, privateKeyToAccount("0x" + "11".repeat(32)));
for (let i = 0; i < 3; i++) {
  try { await r.getOrder("SOMI:USDso", "1"); console.log("ok"); }
  catch (e: any) { console.log("call", i + 1, "->", e.message.slice(0, 60), "| logins so far", logins); }
}
```
3. `npx tsx t.mts`

## Expected
On a 401/403 from an authenticated endpoint the client clears its token, logs in again once, and retries (the documented fallback; the API docs also say a token can be re-obtained at any time via nonce → sign → login).

## Actual
```
call 1 -> DreamDEX API 401 unauthorized: {"name":"unauthorized"} | logins so far 1
call 2 -> DreamDEX API 401 unauthorized: {"name":"unauthorized"} | logins so far 1
call 3 -> DreamDEX API 401 unauthorized: {"name":"unauthorized"} | logins so far 1
```
`request()` in `packages/core/src/rest.ts` throws `DreamDexApiError` on any non-2xx; `ensureAuth()` only compares `Date.now()` with the stored `tokenExpiry`. The "fallback" in the doc is not implemented, so the process stays locked out until the old token's `expiresAt`, which is exactly the unattended-bot failure the section warns about.

## Evidence
Output above (login count stays at 1; a second login would have succeeded).

## Environment
dreamdex-bot-kit v0.1.0 (main, 2026-11-02), Node 22, tsx, viem.
