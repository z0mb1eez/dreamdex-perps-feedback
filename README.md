# dreamDEX Perps Builder Bounty: Feedback track

123 reproducible feedback items for the dreamDEX Perps API, WebSocket API, SDK and documentation on the Somnia testnets (Hideki perps testnet, chain 50383, and the Shannon/mainnet spot deployments referenced from the same docs). One item per file in `feedback/`, in the format requested by the program (Severity, Area, Steps to reproduce, Expected, Actual, Evidence, Environment).

Method: every documentation claim was compared against a live response from the public endpoints (REST, WebSocket, JSON-RPC, indexer GraphQL) or against the published `@somnia-chain/markets-sdk@0.32.1` package and `dreamdex-bot-kit`. Every item was reproduced with real captured output and timestamps; the live-endpoint items were run more than once, and several were cross-checked a second time independently (different script, same result) before inclusion. The dreamdex-bot-kit items run the kit's own compiled code or strategy classes against stubs, so they need no network or key. All checks were read-only, rate-limited, and sent no transactions. AI tools assisted with the testing and drafting; all evidence shown is real captured output, not invented.

Severity: 12 major, 111 normal. Areas: SDK (69), docs (25), API (27), contracts (2).
