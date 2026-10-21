# Athom "socket hang up" / processing_failed / AggregateError — root-cause study (P2930, 21/10/2026 Paris)

Upload always succeeds; Athom's processing of the build fails 40–70 s later with no error body.
Data: Athom build history of the three apps (read-only workflow `athom-build-history.yml`, run
39570436772 / 39570806991), the `publish-size-telemetry` artifacts (41 rows) and the publish run logs.

## 1. Natural experiment — failure rate vs manifest size

| App | Window | Builds | processing_failed | Rate | Drivers | Flow cards in payload | app.json sent |
|---|---|---|---|---|---|---|---|
| Bastien | 19→24/09 (full manifest, before P2724 slim) | 105 | 53 | **50 %** | ~full | ~full | ~3+ MB |
| Bastien | 25/09→21/10 (house-fleet slim, P2724) | 90 | 7 | **8 %** (0/38 since 13/10) | 27 | ~1 000 | 0.6 MB |
| Stable | 17/09→21/10 | 199 | 58 | **29 %** | 338 | 5 455 | 3.2 MB |
| Master | last 60 builds | 59 | 36 | **61 %** | 347–349 | 6 111–6 118 | 3.6 MB |

Same account, same CLI, same pipeline: the rate follows the manifest (drivers × flow cards),
and Bastien's own rate dropped from 50 % to 8 % on the day its manifest was slimmed.

## 2. Hypotheses rejected with data

| Hypothesis | Evidence | Verdict |
|---|---|---|
| Concurrent uploads of the 3 apps | Upload within ±5 min of another app: 3 fail / 9; alone: 13 fail / 21 (33 % vs 62 %) | No positive correlation — no cross-app serialization added |
| Payload bytes / file count | Stable payload (33 MB) is larger than master (31 MB) yet fails half as often; Bastien 21 MB/2 511 files ≈ 0 % | Not the driver |
| "66 MB / 8 678 files stable retries passed" | Telemetry artifact: it counted the nested `.homeybuild` the CLI writes; the CLI uploads one tree | Telemetry fixed (skips `.homeybuild`) |
| Oversized images | 451 large.png 500×500, 451 small.png 75×75, total images 5.4 MB, largest 149 kB | Not the cause |
| Zero-byte files, symlinks, non-ASCII names | 0 / 0 / 0 in the build | Not the cause |
| Same content flips pass/fail | 9.0.1560–1563 near-identical: 4 fails then 1565–1567 pass | Non-deterministic → time budget on Athom's worker, scaled by manifest work |

## 3. Defects found in the payload (fixed)

| Defect | Master before | Master after | Stable before | Stable after |
|---|---|---|---|---|
| Orphan flow cards (device filter names only absent drivers) | 1 507 / 6 118 (25 %) | 0 / 4 611 | 1 409 / 5 455 (26 %) | 0 / 4 046 |
| app.json sent | 3.65 MB | 3.09 MB (−15 %) | 3.23 MB | 2.73 MB |
| Driver folders absent from the manifest (dead payload) | 102 dirs, 2.78 MB, 682 files | 0 | 104 dirs | 0 |

Cause: the Zigbee matrix compaction prunes 102 synthetic drivers from the manifest but kept their
flow cards and folders (the publish hold already dropped its own). Bastien had the same defect (430
orphans, P2928). Every orphan card makes Athom's processor resolve a filter against a driver that
does not exist. Fix: `scripts/maintenance/prune-orphan-flow-cards.cjs`, called by
`scripts/prepare-publish.js` (step 5a3, fail-closed), lossless (no Flow can use a card of a driver
that is not shipped); mixed filters only lose the absent ids. Payload validated by homey-lib at
level `publish` on both branches.

## 4. OTA firmware

27 `.bin` files, 2.8 MB (~8 % of bytes, incompressible), some duplicated across drivers
(e.g. `oem_zg_tl8258_plug_OTA_1.1.2.bin` in smartplug + plug_energy_monitor). None in pruned folders.
Fetching on demand would save ~2.5 MB gz but changes runtime OTA behaviour; not done here.
Size is not the main driver (section 2), so this is an optimisation, not the root-cause fix.

## 5. Other CI fixes in P2930
- `bastien-publish.yml` now triggers on every payload path (app.js, settings, locales, capabilities,
  config, prepare/prune scripts), not only app.json; write-back stays `[skip ci]`, the per-app group serializes.
- Retries (`athom-retry-policy.js`) kept as safety net.

## 6. To measure next
Failure rate of master/stable builds after 9985538dc4 / f178ceb896 (master) and 89214d1a88 / 94148bfc03 (stable),
via `athom-build-history.yml`. Remaining lever if still > ~10 %: reduce the 4 611 remaining cards
(driver-level duplicates) — needs a user decision as card ids are user-visible.

## 7. First results after the fix (21/10/2026, Paris time)

| App | Build | Payload | Result |
|---|---|---|---|
| Stable | 5.12.487 (11:12) | 28.0 MB / 3 655 files, 9.7 MB gz, app.json 2.59 MB, 4 046 cards, 0 orphans | processing_failed |
| Stable | 5.12.488 (11:23) | same | processing_failed |
| Master | 9.0.1579 (11:05) | orphan prune + dead folders removed | processing_failed |
| Bastien (unchanged, 27 drivers) | 1.0.188 (11:11) | 21 MB, 0.65 MB app.json | processing_failed |

Since 09:30 all three apps fail together, including the slim Bastien app (0/38 failures from
13/10 to this morning). Removing the orphan cards (−25 % cards, −15 % app.json, −10 % files) did not
flip the outcome on its own. HEIMAN is ruled out as a trigger (stable and Bastien do not ship it).
Today's data points to an Athom-side degradation that hits every app; the historical
manifest-size correlation (section 1) is still real, but it is not the whole explanation.
Next measurement: the share of failures per app over the next days, with `athom-build-history.yml`.

## P2930f — bisect du 21/10/2026 (11:50–14:10, heure de Paris)

**Bastien (bastien-home)** : contenu exact 1.0.187 puis P2931 → P2934 ajoutés un par un sur une branche temporaire (supprimée).
- 1.0.197 (contenu 1.0.187) : processing_failed ; 1.0.198, même contenu : Test.
- 1.0.199 (+ registre clusters P2931), 1.0.200 (+ WiFi P2930), 1.0.201 (+ overlay P2931), 1.0.204 (+ P2932-P2934) : tous en Test du premier coup.
- Verdict : aucun commit coupable ; les échecs 1.0.188-1.0.196 étaient côté Athom (même contenu qui échoue puis passe). Taille stable (≈20,0-20,3 Mo, 640 cartes).

**master** : dernier Test 9.0.1574 (20/10). Échecs AggregateError depuis 9.0.1575 (21/10 09:05 Paris).
- Seul delta driver 1574→1575 : P2919 (HEIMAN/SmokeSensor-EF-3.0 sur smoke_detector_advanced, Samotech/eWeLight sur dimmer_1_gang).
- Étape A : HEAD master sans le couple HEIMAN fumée → 9.0.1589 et 9.0.1590 AggregateError.
- Étape B : contenu EXACT 9.0.1574 (dernier Test, 29,90 Mo / 4406 fichiers, identique) re-uploadé → 9.0.1591 AggregateError.
- Verdict : la cause n'est PAS dans le contenu du dépôt depuis 1574 (ni P2951-P2953 tuya-local, ni HEIMAN, ni la taille : HEAD est plus petit, 27,3 Mo / 3777 fichiers / 4611 cartes). L'échec est propre à l'app Universal Tuya côté Athom (même archive qui passait la veille). Ne pas « corriger » du contenu à l'aveugle ; ne pas contacter Athom (règle).
- Note pipeline : sur le groupe de concurrence partagé, chaque push master remplace le run en attente ; un dispatch de bisect doit être ré-armé jusqu'à démarrer.
