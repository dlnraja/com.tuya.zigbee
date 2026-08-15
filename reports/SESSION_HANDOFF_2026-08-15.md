# SESSION HANDOFF — 2026-08-15 (L99 investigation resume)

> Dual-app BOTH when in doubt (Peter may be on stable). Silent forum (T157628).
> Full synthesis: `reports/L99_INVESTIGATION_2026-08-15.md`

## Live versions

| Track | Branch | Homey Test |
|-------|--------|------------|
| Preview | `master` | **9.0.518** (code + Buffer/L99 on top of bot bump) |
| Stable | `stable-v5` | **5.12.81** ✅ (#525) |

Peter #2137 (v5.12.70 Gecrasht) → update to **≥5.12.81**.

## Done (do not redo)

| Item | Ref |
|------|-----|
| Peter crash class SOS/DCM/IAS/contact/water/ZT08 | #518–#522 |
| Athom hang republish + combo budget | #523–#524 → 5.12.80 |
| `capability is not defined` + radar TZE284 | #525 → 5.12.81 |
| stable `pr-gate.js` missing | #526 |
| FP collisions climate catchall | master 9.0.517 |
| FreeScrapeStack TITAN utf8→Buffer | L99 syntax fix |
| `onDeleted_null` gate | fixed_p349 (code already guarded) |

## Waiting list

### P0
- [x] Stable Test 5.12.81
- [x] Master Auto-Publish 9.0.517
- [x] Unified CI green / FP collisions 0 new
- [ ] Syntax Check green after FreeScrapeStack Buffer fix (push)
- [ ] Shared App ID awareness (Test flips between tracks)

### P1
| Item | Status |
|------|--------|
| Forum FPs #2130–2135 | OK |
| GH #513 / #420 | done |
| Gmail local secrets | GHA only |
| auto-heal-radar stub | MASTER_ONLY optional |

### Doctrine
Sacred Couple · BOTH crashes · no full-tree · no AI forum paste

## Commands
```bash
npm run diag:self-test
npm run check:gmail-crashes:json
node .github/scripts/fp-collision-check.js --baseline .github/fingerprint-collision-baseline.json
```

Transcripts: [Peter dual-app](6eb1e32a-de4c-43bd-bb0a-cffbe381b9a3) · [AI recovery Aug10](73f0d460-25f5-46a5-a062-6177e0bf227f)
Updated: 2026-08-15T16:10Z L99
