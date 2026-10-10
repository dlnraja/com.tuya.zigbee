# Max coverage investigate (P177/P179)

Generated: 2026-10-06T09:27:42.484Z

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
| dual-claim | ✓ | yes | 109 |
| dual-claim-brands | ✓ | yes | 101 |
| align-mfs | ✓ | yes | 1712 |
| sacred-registry | ✓ | yes | 8840 |
| sacred-class | ✓ | yes | 795 |
| energy | ✓ | yes | 59 |
| heap | ✓ | yes | 88 |
| gmail-patterns | ✓ | yes | 27 |
| layers | ✓ | yes | 125 |
| forum-paste | ✓ | yes | 27 |
| blakadder-dry | ✓ | no | 26 |
| multi-source | ✓ | yes | 146864 |
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
