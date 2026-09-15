# Max coverage investigate (P177/P179)

Generated: 2026-09-15T08:02:51.249Z

## Mode

- with-scan: false
- apply-safe: false
- strict: false

## Intelligence

- TZ dual-claims: null
- Brand dual-claims: null
- mfs high drift: null

## Phases

| Phase | OK | Hard | ms |
|-------|----|------|----|
| dual-claim | ✓ | yes | 98 |
| dual-claim-brands | ✓ | yes | 100 |
| align-mfs | ✓ | yes | 1372 |
| sacred-registry | ✓ | yes | 11728 |
| sacred-class | ✓ | yes | 552 |
| energy | ✓ | yes | 62 |
| heap | ✓ | yes | 86 |
| gmail-patterns | ✓ | yes | 28 |
| layers | ✓ | yes | 118 |
| forum-paste | ✓ | yes | 28 |
| blakadder-dry | ✓ | no | 27 |
| multi-source | ✓ | yes | 144649 |
| analyze-diag-locally smoke | ✓ | yes | 37 |

## Recommendations

- Coverage growth: mega-crawl.yml (daily) + weekly-sovereign-loop.yml — do not invent sync-mfs-db codegen.
- FP apply: tools/ci/apply-blakadder-new.js dry-run → human review → --apply on master only.
- Peter soak: Homey Test ≥9.0.541; new diag only if OOM persists (LiveData settings, not fingerprints.json).

## Hard rules

- No bidirectional mfs→device.js generation (P171–P176)
- No JSON >2MB fail gate (breaks mfs_db; OOM ≠ fingerprints)
- Forum silent-first (T157628)

JSON: `.github/state/max-coverage-investigate.json`
