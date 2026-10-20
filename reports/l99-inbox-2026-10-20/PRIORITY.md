# L99 Inbox Intelligence — 2026-10-20

Silent only. **Never** Homey forum POST / PM / AI paste (T157628).
Lock **manufacturerName + productId** only. Never invent pid. Dual-app: BOTH | MASTER_ONLY | STABLE_ONLY.
**P2529:** also audit DP / clusters / flow wire / RX-TX (not couple-lock only).

Generated: **2026-10-20T22:43:30.728Z** · Mode: `full`

## Snapshot

| Channel | Count / note |
|---------|--------------|
| GitHub open issues | 6 |
| GitHub open PRs | 1 |
| Forum needAction | 71 |
| Gmail crash state | present |
| mfs high drift | 0 |
| Deep functional | ran (P2529) |

## Priority queue (intelligent)

| Score | Dual | Source | ID | Action |
|------:|------|--------|----|--------|
| 90 | BOTH | github-issue | #560 | investigate-code-silent |
| 90 | BOTH | github-issue | #550 | investigate-code-silent |
| 75 | BOTH | forum | forum-need-action | enrich:investigate + deep-functional (DP/cluster/flow/RX-TX, not mfr+pid only) |
| 70 | BOTH | github-issue | #557 | investigate-code-silent |
| 70 | BOTH | github-issue | #571 | investigate-code-silent |
| 70 | BOTH | github-issue | #570 | investigate-code-silent |
| 70 | BOTH | github-issue | #559 | investigate-code-silent |
| 50 | MASTER_ONLY | github-pr | PR#573 | review |

## Phase results

- **guard**: ok (0ms)
- **github**: ok (559ms)
- **gmail**: ok (203ms)
- **forum**: ok (30138ms)
- **drivers**: ok (1634ms)
- **functionalDeep**: ok (2869ms)

## Doctrine

- Publish = Homey App Store Test (Auto-Publish). Do not post = no Community replies.
- P2529 deep functional: DP / cluster / flow wire / RX-TX — complementary (P2520).
- See `docs/architecture/L99_INBOX_INTELLIGENCE.md` + `docs/rules/DEEP_FUNCTIONAL_ENRICH.md`.

