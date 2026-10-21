# Cross-research (P2936) — one full cross-check for every request

Every incoming item (needs-info sweep, open issues, forum reports, Homey Gmail diag / crash ids,
CI reports) goes through the same pass: `scripts/research/cross-research.js`.

## Sources crossed per item
| Source | How | Role |
|---|---|---|
| Forum post + replies | Discourse public JSON, cached 30 d | couple source |
| Same user's other posts | `user_actions.json` (30 max), cached 14 d | hint only |
| GitHub issue + comments | `gh issue view`, cached 7 d | couple source |
| Screenshots | OCR caches (`forum-image-ocr.json`, `image-ocr.json`) + tesseract (capped) | couple source |
| Homey Gmail diags / crash mails | `data/diag-ids.json` (ids only, built by `diag-ids.js`) | couple source |
| Git history | `git log --grep` | hint only |
| Z2M, ZHA quirks, deCONZ DDF, Blakadder, tuya-local, Johan app | shallow clones (`fetch-refs.sh`) → `lib/ref-index.js` | confirmation + driver choice + model deduction |
| Web search | Google CSE only if `XR_WEB=google-cse` + key, cap `XR_WEB_CAP` (default 0) | hint only |
| AI | off unless explicitly enabled within included quota | hint only |

## Rules
- An id is only used if it appears verbatim in evidence (post, OCR, diag, listing). Never invented.
- A couple is formed only from mfr + pid in the **same** text unit. Several pids in one text: only pairings already confirmed by a reference or our drivers are kept.
- mfr without pid: the pid is taken from references only when they all agree on a single pid.
- Without ids: model / brand / device-type keywords are ranked against reference records (model match required) → ranked candidates with links (lead).

## Verdicts
- **place** — exact couple confirmed by ≥ 1 reference; target = the one specific driver that hosts the reference's sibling manufacturerNames with this productId (majority, no split). Gate `canPlace`: target lists the pid, no duplicate couple elsewhere. Written via byte-identical JSON round-trip, logged in `auto-applied.json` (via=cross-research, refs), credited in CREDITS.md.
- **covered** — a specific driver already matches.
- **provisional** — ids from evidence, no confirming reference (or no unique driver). Hosted by `universal_zigbee` (native clusters, DPs optional) only when the manufacturerName is on no driver at all, so a sacred couple is never duplicated. Record: `data/leads/provisional-couples.json` (confidence, evidence, refs).
- **lead** — ranked candidates / partial ids, kept in the sweep SSOT with links.
- **no-action** — nothing usable; item stays needs-info.

## Promotion / demotion (every run)
`promoteDemote()`: a provisional couple that a reference now confirms with a single target driver is moved there (and removed from the generic host); one that now conflicts (manufacturerName on a specific driver) is removed from the host and kept with `status: demoted` + reason. Nothing is silently deleted.

## Workflows (job `cross-research`, composite `.github/actions/cross-research`)
forum-poll (forum), fleet-intelligent-enrich + auto-enrich-closed-loop (needs-info), gmail-diagnostics + fetch-diags (diags), auto-bot-issue-triage (issues), weekly-sovereign-loop (all). Pinned actions; caps on items, network calls (400), OCR (40), placements (10) and provisional (10) per run; cache restored between runs. Kill switch `vars.XR_ENABLED=false`, report-only `vars.XR_APPLY=false`. Commit only through `safe-auto-commit.js`; placements are reverted if the regression lock test fails.

## Self-enrichment vectors (ranked value / risk)
| # | Vector | Value | Risk | State |
|---|---|---|---|---|
| 1 | Cross-research on every item, every workflow | high | low | **done** (this doc) |
| 2 | Provisional tier + automatic promotion/demotion | high | low (generic host, gates) | **done** |
| 3 | Upstream incremental watch (index diff → `upstream-delta.json`, triggers promotions) | high | low | **done** |
| 4 | Ids from Homey diag / crash / mail / CI reports → `diag-ids.json` → cross-check | high | low | **done** |
| 5 | Confidence scoring on leads / couples | medium | none | **done** |
| 6 | Regression lock generated from each placement (data-driven test) | medium | none | **done** |
| 7 | Runtime unknown DPs / frames (UnknownDPLogger) → diag → auto-mapping proposal | high | medium (wrong DP mapping) | pending: proposals only, human review |
| 8 | Per-device adaptive windows persisted (button debounce, report intervals) | medium | medium (store writes) | pending |
| 9 | CI failure-pattern learning (athom-build-history) | medium | low | partial (existing history workflow) |
| 10 | Optional AI layer within included quotas | low-medium | medium (hallucinated ids) | pending, hints only, never a couple source |

Credits: device identities cross-checked against Koenkk/zigbee-herdsman-converters (MIT), zigpy/zha-device-handlers (Apache-2.0), dresden-elektronik/deconz-rest-plugin DDF (BSD-3), blakadder/zigbee (MIT), make-all/tuya-local (MIT), JohanBendz/com.tuya.zigbee (GPL-3.0). Only fingerprints are used; all code is our own.
