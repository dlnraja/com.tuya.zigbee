# Inbox L99 — 2026-08-31 r3 (P2351)

Silent enrichment only. No Homey forum posts.

## Harvest

| Source | Result |
|--------|--------|
| GitHub open issues | **#533** Salvagr Moes curtain (only open) |
| GitHub open PRs | none |
| Gmail crashes (today) | Thread `1a0571cc0b50d751` — **v9.0.730** + **v9.0.743** |
| Forum silent | 53 need-action; mostly tip-update / LOCKED_OK / MISSING_PID (need diag) |
| Syntax Check P169 | FAIL → fixed (Cartesian registry) |

## Critical crash — P2351

```
Error: Invalid Driver ID: ZG9101SAC_HP
  at ManagerDrivers._getDriverManifest
  at ManagerDrivers.getDriver
  at HomeySerializer.parse (flow deserialize)
```

- **Cause:** Hue / foreign driver token in shared flows; Athom serializer calls our app's ManagerDrivers.
- **Prior P2306** patched `getDriver` at module load only — still crashed on 9.0.743 (instance / `_getDriverManifest`).
- **Fix:** `lib/utils/safe-get-driver-patch.js` — soft-fail getDriver + `_getDriverManifest`; re-bind on `this.homey.drivers` in `App.onInit`.
- **Test:** `test/critical/p2351-safe-get-driver-foreign-id.test.js`
- **Track:** BOTH (reliability)

## CI mfs drift — P2351 companion

`p2347-gabriel-zemismart-verified-only` listed 6 gang mfrs + TS0001/2/3 on `wall_switch_1gang_1way` → `align-mfs-db-intelligent --check` wanted to merge 2gang/3gang onto 1gang.

- Replaced with **enrichOnly** empty-mfr doc case.
- Align script skips `enrichOnly` + refuses Cartesian multi-mfr×multi-gang-pid cases.

## User / couple matrix (no invent)

| User / issue | Couple | Action |
|--------------|--------|--------|
| Salvagr #533 | `_TZE204_5slehgeo`+TS0601 → `curtain_motor` | tip ≥9.0.744 + re-pair (P2348) |
| PresentSky | `_TZE284_m1cvyneb`+TS0601 | P2333/P2350 tip ≥9.0.745 |
| meter91 | `_TZ3000_zgyzgdua`+TS0044 | tip ≥9.0.738 |
| VicHY | `_TZE204_clrdrnya`+TS0601 | tip ≥9.0.744 |
| Adam #532 | FCU | closed OK @ 9.0.743 |
| Gabriel #2173 | per-gang sacred-keep | do not Cartesian invent |
| SunBeech wkai4ga5+TS0042 | NOT locked | known couple is **TS0044** → `scene_switch_4` — need diag for TS0042 |

## Docs touched

- `docs/knowledge/PECULIARITIES.md` — P2351 crash + Cartesian refuse
- This report
- Registry + align script comments

## Ship checklist

1. Master: P2351 patch + registry + tests → Auto-Publish
2. Stable: backport soft-get-driver + align/registry (BOTH)
3. Users on crash: update Test after tip bumps; remove broken Hue-token flows if still noisy
