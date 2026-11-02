# docs/MIGRATING.md says 0.32.0 is "available as prereleases" (it and 0.32.1 are stable, `latest`), and its two CHANGELOG.md links point at a file the package does not ship
Severity: normal
Area: docs

## Steps to reproduce
1. `npm view @somnia-chain/markets-sdk dist-tags --json` and `npm view @somnia-chain/markets-sdk time --json | grep -E '"0.32'`
2. `mkdir t && cd t && npm pack @somnia-chain/markets-sdk@0.32.1 && tar xzf *.tgz && sed -n 1,16p package/docs/MIGRATING.md && ls package` (run the tar in a fresh empty dir)
3. `grep -rn "CHANGELOG" package/README.md package/docs`

## Expected
MIGRATING.md (shipped in 0.32.1) is written for the version it ships with. Its intro should not describe the released 0.32.0 as unreleased, and its relative `[changelog](../CHANGELOG.md)` links should resolve.

## Actual
The intro says: "`0.31.0` was published to public npm on September 29, 2026. The `0.32.0` series is available as prereleases. A consumer moving from `0.30.0` to a `0.32.0` prerelease applies both sections below... Check the target version in the changelog; prereleases can add migrations before the plain `0.32.0` release." But npm has `latest = 0.32.1`, plain `0.32.0` was published 2026-10-12 and `0.32.1` on 2026-10-13. The package contents are `dist docs LICENSE package.json README.md src` - there is no CHANGELOG.md, so the two links `../CHANGELOG.md` (lines 8 and 13 of docs/MIGRATING.md) are dead for anyone reading the docs from the npm tarball or node_modules.

## Evidence
```
$ npm view @somnia-chain/markets-sdk dist-tags --json
{ "rc": "0.32.0-rc.1791380050012", "next-0.31": "0.31.1-rc.1791533467513", "next-0.32": "0.32.1-rc.1791818930433", "latest": "0.32.1", ... }
"0.32.0": "2026-10-12T13:25:00.116Z",
"0.32.1": "2026-10-13T09:04:28.229Z",
$ ls package
dist  docs  LICENSE  package.json  README.md  src
$ grep -rn CHANGELOG package/README.md package/docs
package/docs/MIGRATING.md:8:[changelog](../CHANGELOG.md).
package/docs/MIGRATING.md:13:version in the [changelog](../CHANGELOG.md); prereleases can add migrations
```
(Checked 2026-11-02. A markdown link check over every relative link in README.md and docs/**/*.md of the package found only these two broken.)

## Environment
- @somnia-chain/markets-sdk 0.32.1 tarball, npm registry, Linux
