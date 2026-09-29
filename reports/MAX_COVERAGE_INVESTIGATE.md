# Max coverage investigate (P177/P179)

Generated: 2026-09-29T09:06:58.664Z

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
| dual-claim | ✓ | yes | 107 |
| dual-claim-brands | ✓ | yes | 105 |
| align-mfs | ✓ | yes | 1778 |
| sacred-registry | ✓ | yes | 9408 |
| sacred-class | ✓ | yes | 793 |
| energy | ✓ | yes | 64 |
| heap | ✓ | yes | 85 |
| gmail-patterns | ✓ | yes | 32 |
| layers | ✓ | yes | 129 |
| forum-paste | ✓ | yes | 32 |
| blakadder-dry | ✓ | no | 30 |
| multi-source | ✓ | yes | 147371 |
| analyze-diag-locally smoke | ✓ | yes | 45 |

## Recommendations

- Coverage growth: mega-crawl.yml (daily) + weekly-sovereign-loop.yml — do not invent sync-mfs-db codegen.
- FP apply: tools/ci/apply-blakadder-new.js dry-run → human review → --apply on master only.
- Peter soak: Homey Test ≥9.0.541; new diag only if OOM persists (LiveData settings, not fingerprints.json).

## Hard rules

- No bidirectional mfs→device.js generation (P171–P176)
- No JSON >2MB fail gate (breaks mfs_db; OOM ≠ fingerprints)
- Forum silent-first (T157628)

JSON: `.github/state/max-coverage-investigate.json`
