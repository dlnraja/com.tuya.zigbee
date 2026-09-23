# Gmail Homey build-failed treat — 2026-09-23 (P2696)

## Emails read (full body)

### Thread `failed processing` (noreply@homey.app)
All bodies identical pattern:

> Unfortunately, your build #N for app … has failed processing.
> **socket hang up**

| When (UTC) | App | Build |
|------------|-----|-------|
| 08:03 | stable | #225 |
| 08:32 | bastien | #77 |
| 08:59 | universal | #3340 |
| 09:41 | bastien | #78 |
| 10:24 | bastien | #80 |

### Recovered siblings (same day)
| App | Created → draft → testing |
|-----|---------------------------|
| universal | #3341, **#3342 testing** |
| stable | #227, **#228 testing** |
| bastien | **#79 testing** (#80 still PF — tip lag / race) |

**Verdict:** Athom transient (P139). Not packing / content. Concurrent 3-track uploads amplified hang rate.

### Crash mail (stable 5.12.288 + 5.12.290)
```
Error: Cannot find module '../../lib/tuya/TuyaRadarRangeScale'
at PresenceSensorRadarDevice._convertRadarSettingValue
```
Already locked by **P2650** (module ships + soft-require). Tip ≥5.12.313 (now **5.12.314**).

## CI failure (Unified CI 35850524779)
Fleetwood `PRE_COMMIT_CHECKS.js` exit 1:

```
CRITICAL: JS_SYNTAX in lib/drivers/ZigBeeDriverFlowCardPatch.js
Syntax error: Illegal return statement
```

Root cause: top-level `return` after soft-skip (P2676). Warnings dump (2600 NAN from `scripts/`) flooded logs.

## Fixes shipped (P2696) — BOTH

1. **ZigBeeDriverFlowCardPatch** — `if (!ZigBeeDriver) module.exports=null` (no illegal return)
2. **PRE_COMMIT_CHECKS** — soft NaN/identity only on `lib/`+`drivers/`; cap warn print + by-type summary
3. **Publish concurrency** — shared group `athom-developer-api-publish` on master + stable + bastien workflows (`cancel-in-progress: false`)
4. **Tests** — `check:p2696` + extended `check:p2676` + keep `check:p2650`
5. **Tips** — Universal **9.0.1201** · Stable **5.12.314** · Bastien **1.0.72**

## Contre quoi
- Illegal return → Unified CI red while Homey publish green
- 3-app Athom flood → socket hang spam emails
- Missing TuyaRadarRangeScale → stable crash mail
