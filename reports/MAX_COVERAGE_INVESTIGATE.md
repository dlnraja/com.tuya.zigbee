# Max coverage investigate (P177/P179)

Generated: 2026-09-08T07:27:20.869Z

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
| dual-claim | ✓ | yes | 95 |
| dual-claim-brands | ✓ | yes | 98 |
| align-mfs | ✓ | yes | 1270 |
| sacred-registry | ✓ | yes | 10434 |
| sacred-class | ✓ | yes | 539 |
| energy | ✓ | yes | 58 |
| heap | ✓ | yes | 84 |
| gmail-patterns | ✓ | yes | 29 |
| layers | ✓ | yes | 116 |
| forum-paste | ✓ | yes | 27 |
| blakadder-dry | ✓ | no | 24 |
| multi-source | ✓ | yes | 142001 |
| analyze-diag-locally smoke | ✓ | yes | 38 |

## Recommendations

- Coverage growth: mega-crawl.yml (daily) + weekly-sovereign-loop.yml — do not invent sync-mfs-db codegen.
- FP apply: tools/ci/apply-blakadder-new.js dry-run → human review → --apply on master only.
- Peter soak: Homey Test ≥9.0.541; new diag only if OOM persists (LiveData settings, not fingerprints.json).

## Hard rules

- No bidirectional mfs→device.js generation (P171–P176)
- No JSON >2MB fail gate (breaks mfs_db; OOM ≠ fingerprints)
- Forum silent-first (T157628)

JSON: `.github/state/max-coverage-investigate.json`
