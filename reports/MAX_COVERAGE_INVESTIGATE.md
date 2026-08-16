# Max coverage investigate (P177)

Generated: 2026-08-16T13:13:33.878Z

## Mode

- with-scan: false
- apply-safe: false

## Phases

| Phase | OK | Hard | ms |
|-------|----|------|----|
| dual-claim | ✓ | yes | 373 |
| align-mfs | ✓ | no | 1595 |
| sacred-registry | ✓ | no | 1843 |
| sacred-class | ✓ | yes | 4016 |
| energy | ✓ | yes | 932 |
| heap | ✓ | yes | 1130 |
| gmail-patterns | ✓ | yes | 886 |
| layers | ✓ | yes | 891 |
| forum-paste | ✓ | yes | 104 |
| blakadder-dry | ✓ | yes | 175 |
| multi-source | ✓ | yes | 47127 |
| analyze-diag-locally smoke | ✓ | yes | 119 |

## Recommendations

- Coverage growth: mega-crawl.yml (daily) + weekly-sovereign-loop.yml — do not invent sync-mfs-db codegen.
- FP apply: tools/ci/apply-blakadder-new.js dry-run → human review → --apply on master only.
- Peter soak: Homey Test ≥9.0.541; new diag only if OOM persists (LiveData settings, not fingerprints.json).

## Hard rules

- No bidirectional mfs→device.js generation (P171–P176)
- No JSON >2MB fail gate (breaks mfs_db; OOM ≠ fingerprints)
- Forum silent-first (T157628)

JSON: `.github/state/max-coverage-investigate.json`
