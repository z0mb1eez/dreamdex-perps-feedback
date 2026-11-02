# dreamDEX Perps Builder Bounty: Feedback track

33 reproducible feedback items for the dreamDEX Perps API, WebSocket API, SDK and documentation on the Somnia testnets (Hideki perps testnet, chain 50383, and the Shannon/mainnet spot deployments referenced from the same docs). One item per file in `feedback/`, in the format requested by the program (Severity, Area, Steps to reproduce, Expected, Actual, Evidence, Environment).

Method: every documentation claim was compared against a live response from the public endpoints (REST, WebSocket, JSON-RPC, indexer GraphQL) or against the published `@somnia-chain/markets-sdk@0.32.1` package and `dreamdex-bot-kit`. Every item was reproduced at least twice with real timestamps, and several were cross-checked a second time independently (different script, same result) before inclusion. All checks were read-only, rate-limited, and sent no transactions. AI tools assisted with the testing and drafting; all evidence shown is real captured output, not invented.

Severity: 2 major, 20 normal. Areas: docs (14), API (6), SDK (1), contracts (1).
