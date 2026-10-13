# Max coverage investigate (P177/P179)

Generated: 2026-10-13T09:46:30.431Z

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
| dual-claim | ✓ | yes | 103 |
| dual-claim-brands | ✓ | yes | 104 |
| align-mfs | ✓ | yes | 1769 |
| sacred-registry | ✓ | yes | 11271 |
| sacred-class | ✓ | yes | 767 |
| energy | ✓ | yes | 61 |
| heap | ✓ | yes | 89 |
| gmail-patterns | ✓ | yes | 29 |
| layers | ✓ | yes | 123 |
| forum-paste | ✓ | yes | 30 |
| blakadder-dry | ✓ | no | 29 |
| multi-source | ✓ | yes | 138980 |
| analyze-diag-locally smoke | ✓ | yes | 39 |

## Recommendations

- Coverage growth: mega-crawl.yml (daily) + weekly-sovereign-loop.yml — do not invent sync-mfs-db codegen.
- FP apply: tools/ci/apply-blakadder-new.js dry-run → human review → --apply on master only.
- Peter soak: Homey Test ≥9.0.541; new diag only if OOM persists (LiveData settings, not fingerprints.json).

## Hard rules

- No bidirectional mfs→device.js generation (P171–P176)
- No JSON >2MB fail gate (breaks mfs_db; OOM ≠ fingerprints)
- Forum silent-first (T157628)

JSON: `.github/state/max-coverage-investigate.json`
