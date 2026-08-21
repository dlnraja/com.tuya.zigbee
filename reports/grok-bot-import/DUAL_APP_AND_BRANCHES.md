# Dual-app Homey — Athom vs git (2026-08-21 ~22:40 PT)

Source: Athom Developer Tools (paste utilisateur t50u) + clones locaux + `git-branches-raw.md`. Aucun pid inventé. Pas de post forum.
Détail patches: `NEXT_PATCHES.md` (patch #0 = CI recoup, **pas** un id swap).

## Mapping sacré (Athom Tools vs git compose)

| Canal | Branche git | Clone local | App ID **Athom Tools** | Nom Tools | Version Tools | Live **git compose** id | HEAD local |
|---|---|---|---|---|---|---|---|
| **Soak / smart / 9.0** | `master` | `C:\Users\Dell\Documents\homey\master` | `com.dlnraja.tuya.zigbee` | Universal Tuya | `9.0.6194730` | **same** `com.dlnraja.tuya.zigbee` **9.0.618** | `1f18cb336` `origin/master` |
| **Reliability / 5.x** | **`stable-v5` EST STABLE** | `C:\Users\Dell\Documents\homey\stable` | leftover slot `com.dlnraja.tuya.zigbee.stable` | Tuya Unified (Stable) | `5.11.216270` | **`com.dlnraja.tuya.zigbee`** compose **5.12.88** / generated **5.12.87** name Universal Tuya | `4ab10842d` `origin/stable-v5` |

`stable-v5` n’est **pas** un soak de 9.0. C’est le canal Stable. **Mais** un `homey app publish` depuis ce clone vise encore l’id 9.0, parce que compose n’a pas le suffixe `.stable`.

Leftover fichier (pas le compose live): stable `stable_app.json` id `.stable` version **5.11.220** name Tuya Unified (Stable) — c’est ce qui correspond au slot Athom, pas au HEAD 5.12.x.

## Live compose (preuve `git-branches-raw.md`)

| Tree | File | id | version | name.en |
|---|---|---|---|---|
| master | `.homeycompose/app.json` + generated `app.json` | `com.dlnraja.tuya.zigbee` | **9.0.618** | Universal Tuya |
| stable | `.homeycompose/app.json` | `com.dlnraja.tuya.zigbee` | **5.12.88** | Universal Tuya |
| stable | generated `app.json` | `com.dlnraja.tuya.zigbee` | **5.12.87** | Universal Tuya |
| stable leftover | `stable_app.json` | **`com.dlnraja.tuya.zigbee.stable`** | **5.11.220** | Tuya Unified (Stable) |

Neither live compose uses `.stable`. Stable `CROSS_APP_PROMPT_RULES.md` qui affirme l’id `.stable` sur `stable-v5` est **stale**.

## CI — quelle GHA publie quel App ID depuis quelle branche

| Workflow | `on` branch | App ID réellement shippé | Tonight (21 Aug ~22:10 PT) |
|---|---|---|---|
| `auto-publish-on-push.yml` | `master`, `main` | compose → `com.dlnraja.tuya.zigbee` | run `32521632767` SUCCESS → Test 9.0.618 |
| `publish-stable.yml` | `stable-v5` | compose → **même** id 9.0 | run `32521664198` SUCCESS **soak-guard SKIP** (Draft/Promote skipped) |
| `auto-fix-and-publish.yml` | `master` + `stable-v5` | publish step `ref_name != 'stable-v5'` → master only | cron can bump 9.0 |
| soak helper | — | `.github/scripts/refuse-stable-test-overwrite.js` `APP_ID \|\| 'com.dlnraja.tuya.zigbee'` | skip if Test is `9.*` |

Counts (`git-branches-raw.md` §5): needle `.stable` in workflows+compose = **0** on stable, **1** on master (`e2e-dashboard-test.yml`). Short id `com.dlnraja.tuya.zigbee` ≈ 11/12 hits.

## Identity work — NOT a naive id swap (ranked)

1. **Keep soak-guard for git publishes.** Shared compose id is still real. Dropping it because Tools shows two slots would let `stable-v5` overwrite Test 9.0.
2. **Identity STABLE local only** = Athom leftover slot + `stable_app.json` 5.11.220. Do not retarget GHA at `.stable` while live compose is primary.
3. **Coordinated compose+workflow switch to `.stable` later, explicit:** stable `.homeycompose/app.json` id+name, soak helper `APP_ID`, `publish-stable.yml` copy/`force_test` text, then (and only then) soak-guard can be relaxed for that id. Do not bump 5.12.88 vs 5.12.87 vs Store 5.11.x blindly.

Ne **pas** inventer un 3e ID. Ne **pas** republier 5.12.x dans le slot 9.0. master ne change **pas** d’id.
master = couches smart/dynamic. stable-v5 = fiabilité only.

## Origin branches (master `git branch -r`, 22:37 PT)

```
origin/HEAD -> origin/master
origin/master
origin/stable-v5
origin/gh-pages
origin/masterwlan
origin/ai/monthly-audit-2026-08
origin/auto/driver-maintenance
origin/auto/johan-sdk3-sync
origin/auto/weekly-fingerprint-sync
origin/codex-diag-timeouts
origin/fix/stable-5.12.79-republish
origin/fix/stable-5.12.80-athom-retry
origin/fix/stable-audit-ias-crash-guards
origin/fix/stable-capability-radar-p136
origin/fix/stable-changelog-zt08-timers
origin/fix/stable-ci-audit-collisions
origin/fix/stable-clusterutils-p137
origin/fix/stable-contact-safe-timers
origin/fix/stable-p139-zt08-dp17
origin/fix/stable-peter-sos-ias-both
origin/fix/stable-pr-gate-missing
origin/fix/stable-sos-catch-abort
origin/fix/stable-utf16-snapshot
```

Qui compte: `origin/master`, `origin/stable-v5`, `origin/gh-pages`, 14× `origin/fix/stable-*`.

## Branches — clone master (`C:\Users\Dell\Documents\homey\master`)

`git status -sb` + `git log -5` (2026-08-21 22:28–22:37 PT)

```
## master...origin/master
 M data/protocol_quirk_table.json
 M lib/io/DeviceIOFacade.js
 M lib/io/ProtocolFallbackChain.js
 M lib/protocol/IntelligentProtocolDetect.js
 M lib/tuya/TuyaZigbeeDevice.js
?? .github/state-forum-tail.json
?? reports/forum-2183/
```

HEAD:

```
1f18cb336 (HEAD -> master, origin/master, origin/HEAD) fix(BOTH): TS0044 0xFD physical press, skip 0x8004, 4-gang flows
324e166a6 v9.0.618: 431 drivers, 3838 FPs [skip ci]
fde68e8bb auto-fix-all
8e46a953f fix(BOTH): coerce IAS zoneStatus Buffer/object to uint16
85ad24d98 v9.0.618: 431 drivers, 3838 FPs [skip ci]
```

Dirty = leftover skip IAS (chemins **réels**, pas `lib/TuyaZigbeeDevice.js`) : `lib/tuya/TuyaZigbeeDevice.js`, `lib/io/DeviceIOFacade.js`, `lib/io/ProtocolFallbackChain.js`, `lib/protocol/IntelligentProtocolDetect.js`, `data/protocol_quirk_table.json`.

Worktree `stable-v5` accroché au clone master: `homey\stable-v5-p195` @ `868dd209d` — **STALE** vs clone stable `4ab10842d`. Ne pas committer depuis ce worktree.

## Worktrees accrochés au clone master (ne pas confondre avec le clone stable)

| Branche | Worktree | Note |
|---|---|---|
| `fix/stable-5.12.80-athom-retry` | `homey\stable-zt08-changelog` | origin tracked |
| `fix/stable-audit-ias-crash-guards` | `homey\master-stable-crashfix` | |
| `fix/stable-capability-radar-p136` | `homey\stable-capability-radar` | |
| `fix/stable-ci-audit-collisions` | `homey\stable-ci-fix-528` | ahead 1 |
| `fix/stable-clusterutils-p137` | `homey\stable-clusterutils-p137` | |
| `fix/stable-contact-safe-timers` | `homey\master-stable-peter2` | |
| `fix/stable-p139-zt08-dp17` | `homey\stable-backport` | |
| `fix/stable-p217-both` | `homey\stable-p217` | **behind origin/stable-v5** |
| `fix/stable-pr-gate-missing` | `homey\stable-pr-gate` | |
| `fix/stable-utf16-snapshot` | `homey\stable-utf16-fix` | |
| `stable-v5` | `homey\stable-v5-p195` | STALE `868dd209d` |

Le clone **canonique** pour Stable est `Documents\homey\stable` sur `stable-v5` @ `4ab10842d` (worktree list: lui seul).

## Branches — clone stable (`C:\Users\Dell\Documents\homey\stable`)

```
## stable-v5...origin/stable-v5
4ab10842d (HEAD -> stable-v5, origin/stable-v5) fix(BOTH): TS0044 0xFD physical press on scene_switch_4 EP1-4
387592c81 fix(BOTH): TS0044 skip 0x8004 write, force 4-gang flows
6613d1584 fix(BOTH): coerce IAS zoneStatus Buffer/object to uint16
8374784e7 fix(BOTH): 4-ep TS0044 scene remote, skip sleepy HYBRID disable, skip false driver toast
717f485ef chore(P52-auto): sync safe changes from master
```

Working tree **clean**. Local extra: `backup-pre-email-rewrite-20260804`.

## Doctrine runtime (rappel, master HEAD `1f18cb336`)

Voir aussi `dynamic-adapt-code.md` / `NEXT_PATCHES.md`.

- Couple sacré = `manufacturerName` + `productId`. Jamais mfr-only (un MFS = des milliers de variants).
- `DeviceFingerprintDB.getDriverId` = compound `mfr|pid` puis refuse mfr catalog si pid hors `modelIds`. Overlay `fingerprints.json` / EnrichedDPMappings / LiveData = encore **mfr-only**.
- Late DP : stocké + `tuya_dp_received`, pas `addCapability` (seuil ≥3 samples). `SmartDriverAdaptation` = `diagnostic_only`, refuse Tuya DP.
- Sleepy IAS : enroll on wake, **pas** de leftover HYBRID-QUERY EF00 (1cf775a2). Skip = BOTH fiabilité ; learn late-DP = MASTER_ONLY.

## Interdit

- Cloud agent Cursor / Max Mode
- Poster sur le forum Community
- Inventer un pid
- Publier Stable dans l’id 9.0 (soak-guard stays until #0c)
- Naive compose id swap to `.stable` without workflows
- JSON.stringify le `app.json` 3.8 MB
- Utiliser le worktree `stable-v5-p195` comme source of truth
