# P192 — Test dashboard publish + Auto-Fix re-inject (2026-08-16)

## What failed

| Surface | Symptom | Cause |
|---|---|---|
| Homey Test / Auto-Publish | `✖ Filepath does not exist: drivers/wall_curtain_switch/assets/firmware/1662693814-….bin` | OTA metadata moved in P190, binary left behind. Fixed in `f2a34c29c`. |
| Unified CI / e2e-dashboard | Same missing OTA filepath | Same. Unified CI already green on the OTA-move commit. |
| Auto-Fix + Publish | Anti-bot post-enrich: 3 FORBIDDEN | `infer-enrich --apply` re-injected registry-locked mfrs using **wrong productIds**. |
| Homey developer dashboard | Login wall | Public Test page readable: **9.0.558** still live while tip is 9.0.561+. |
| Gmail diagnostics | 100 emails, 5 new FPs, 0 auto-added | Historical heap OOM is 9.0.537 (P148). No new publish-failure class. |

## Re-inject proof (Gmail infer-enrich dry-run)

```
_tz3000_qeuvnohg + ts0601 → lcdtemphumidsensor_plug_energy  [mfs_curated]
_tze200_2imwyigp + ts0203 → contact_sensor                  [pid_TS0203_contact]
_tz3210_jaap6jeb + ts0203 → contact_sensor                  [pid_TS0203_contact]
```

Canonical couples (herdsman + registry):

| mfr | real pid | driver |
|---|---|---|
| `_TZ3000_qeuvnohg` | TS011F | `din_rail_switch` |
| `_TZE200_2imwyigp` | TS0601 | `switch_3gang` |
| `_TZ3210_jaap6jeb` | TS0505B | `bulb_rgbw` |

## Fixes (this pass)

1. `anti-bot-regression-gate.js --strip` — detect **and** remove forbidden placements after enrich.
2. `UserMisattributionRegistry.isForbiddenPlacement()` — mfr+driver, no pid required.
3. `bidirectional-enricher.js` + `infer-enrich-from-incomplete.js` refuse registry-forbidden targets.
4. Wired `--strip` into Auto-Fix, auto-enrich, Gmail apply, continuous-flow.
5. Dropped `_TZ3000_qeuvnohg` from `lcdtemphumidsensor_plug_energy` runtime profile list (it was the seed infer-enrich promoted into compose).
6. Removed the orphan OTA binary left at `drivers/curtain_motor_shutter/` (image now only lives next to its metadata).

## Athom publish (9.0.562 #2884)

Upload **succeeded**. Poller then died:

```
Build #2884 state: waiting_for_files → processing → draft
FATAL: Timed out waiting for build #2884 (last state: draft)
```

`direct-api-publish.js` waited for legacy `ready`. Athom now parks a processed build at `draft` until promotion sets `test`. That made the job red and **skipped** the draft→test tiers. Test channel therefore stayed on **9.0.558**.

Fix: treat `draft` / `test` / `live` / `ready` as processed-success so promotion can run.

## Do not

- Create a second Athom upload for 9.0.562 — draft #2884 already exists.
- Treat Gmail “5 new FPs” as compose candidates without a sacred couple.
- Full-tree sync to `stable-v5`.
