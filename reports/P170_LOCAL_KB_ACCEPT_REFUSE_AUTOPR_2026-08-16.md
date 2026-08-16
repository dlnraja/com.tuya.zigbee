# P170 — Local knowledge catalog (accept) + refuse OPUS auto-fix stack (2026-08-16)

## Accepted (local-first, zero AI tokens)

| File | Role |
|------|------|
| `data/error-patterns.json` | Crash/diag symptom catalog (OOM = **LiveData**, not fingerprints myth) |
| `data/device-knowledge-base.json` | Sacred-couple keyed device hints + workaround → existing code |
| `tools/ci/analyze-diag-locally.js` | **Read-only** local matcher (stdin/file/mfr+pid) |

Wired: `gmail-crash-pattern-gate.js` merges external patterns from `error-patterns.json`.

```bash
echo "JavaScript heap out of memory" | node tools/ci/analyze-diag-locally.js --stdin
node tools/ci/analyze-diag-locally.js --mfr=_TZ3000_k4ej3ww2 --pid=TS0207
node tools/ci/gmail-crash-pattern-gate.js --json
```

## Refused (same class as P159–P166)

| Ask | Why |
|-----|-----|
| `generate-fix.js` auto-PR | No autonomous Homey code mutation / auto-PR from pattern match |
| Auto GitHub issue comments with bot footer | Silent enrichment only |
| `autoFixable: true` → ship unreviewed patches | Catalog marks `autoFixable: false`; fixes already in tree |
| OOM cause = `fingerprints.json` >2MB | **False** (P156) — LiveData settings overlay |
| Bare `TS0601` as device identity | Sacred couple required |
| Mass `chore: remove _hybrid` | Deprecated sentinels intentional; empty mfr arrays break compose |
| FeatureFallbackRouter / Homey self-repair | MASTER_ONLY experiments; not Homey runtime bots |

## Explicit next step we will NOT take

“Radical `_hybrid` suffix cleanup” as an automated chore — **no**. Continue sentinel + prepare-publish prune only.
