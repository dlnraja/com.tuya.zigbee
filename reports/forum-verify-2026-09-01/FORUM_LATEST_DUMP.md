# Forum latest dump + integral treat — 2026-09-01

**Policy:** SHADOW only — no forum POST (T157628). Never invent pid.

## Harvest stats

| Source | Result |
|--------|--------|
| Multi-topic silent scan | 22 topics · ~900 posts · 0 new FPs |
| T140352 tail fetch | **#2218** highest · last activity 2026-08-31 20:00 UTC |
| Actionable processor | **248** posts · **54** need-action |
| Auto-investigate | **54** investigated · 8 web hints |
| Silent apply | 79 routes checked · **0** compose changes (already locked) |

Reports: `PROCESS.md` · `NEED_ACTION.md` · `need-action-investigation.json`  
State: `.github/state/forum/multi-silent-digest.json` · `topic-140352-posts.json`

---

## T140352 — derniers messages (#2199 → #2218)

| # | User | Date | Résumé | Couple | Traitement |
|---|------|------|--------|--------|------------|
| 2199 | A_Tas | 08-25 | Moes ZSS-LP-HP02-MS `_TZ3218_t9ynfz4x` — erreur sauvegarde paramètres | mfr seul (pid ABSENT) | **Soft** `_TZ3218_t9ynfz4x+TS0225` → `rain_sensor` registry; settings TX à vérifier sur tip |
| 2201 | dlnraja | 08-25 | Rappel users: update + re-pair (meter91, Toni, Peter, Gabriel…) | — | Ops |
| 2202 | Peter | 08-26 | Water leak “wrong driver” mais flow OK; smartbutton dead · diag `95a7c6e5` | **ABSENT** | IAS/BOTH déjà shipé — **diag couple obligatoire** |
| 2203 | Peter | 08-27 | Idem water + smartbutton · diag `4b1a0dc9` | **ABSENT** | Idem |
| 2204 | Elliot_Hallais | 08-27 | CO2 `_TZE204_ogkdpgy2` classé climate · GitHub #531 | `_TZE204_ogkdpgy2+TS0601` | **P2291 SHIPPED** → `air_quality_co2` · update Test + re-pair |
| 2206 | PresentSky | 08-29 | BSEED dimmer `_TZE284_m1cvyneb` reconnu mais TX dead · diag `60959c24` | **LOCKED** | `wall_dimmer_tuya` · update ≥9.0.744 + re-pair |
| 2207 | meter91 | 08-30 | 4-btn remote unknown · diag `c40705a1` | ABSENT in post | → `scene_switch_4` si `zgyzgdua+TS0044` |
| 2208 | VicHY | 08-30 | Presence `_TZE204_clrdrnya` · diag `4217d5e3` | `_TZE204_clrdrnya+TS0601` | `presence_sensor_radar` · **#2217 résolu** (clear app + reinstall) |
| 2209 | Cam | 08-31 | Smart button + motion — flows morts, couple ABSENT | **ABSENT** | Update + re-pair; diag avec mfr+pid |
| 2210 | dlnraja | 08-31 | Actions: meter91/VicHY/Cam | — | Ops (no auto-post) |
| 2213 | meter91 | 08-31 | Still unknown · interview timeout · diag `2b0b4e4f` | TS0044 in interview | **OPEN** — update ≥9.0.757 + re-pair `scene_switch_4` |
| 2214 | smarthomesven | 08-31 | Alerte: meter91 a posté networkKey | — | Sécurité user |
| 2216–2217 | VicHY | 08-31 | PIR mmWave → generic puis **OK** après reinstall | clrdrnya | **CLOSED** côté user |
| 2218 | Joep_Vullings | 08-31 | Two-way irrigation valve unknown on repair | **ABSENT** | Registry `fhvpaltk` → `valve_dual_irrigation` · update + re-pair |

---

## Autres topics actionable (top)

| Topic | Signal | Traitement |
|-------|--------|------------|
| T158757 #10 Gabriel | Dimmer/gang jitter, flows | BOTH fixes shipés (endpoint jitter, buttons) |
| T158757 #1 A_Tas | Rain/presence mfr | Soft `t9ynfz4x+TS0225` NEED_DIAG |
| T156967 SunBeech/SergeP | 4UPL1FCJ+TS0041, WKAI4GA5+TS0044 | **LOCKED_OK** button_wireless_1 / scene_switch_4 |
| T150690 Graeme/Primordial | KFU8ZAPD+TS0044 remotes | **LOCKED_OK** button_wireless_4 |
| T146667 Michael_Edholm | TRV npj9bug3 soft | NEED_DIAG interview |
| T89271 device requests | DIN/plug/switch couples | Mostly **alreadyInCatalog** — update + re-pair |

---

## Actions code (cette passe)

- Aucun nouveau couple apply-safe (compose déjà à jour).
- VicHY clrdrnya : pas de patch — user fix = reinstall app.
- meter91 : pas de nouveau FP — vérifier publish tip ≥9.0.757 et interview timeout pairing.
- Joep : `valve_dual_irrigation` a `_TZE284_fhvpaltk` — pas inventer; user update + re-pair.

## Commandes

```bash
npm run forum:silent-scan
npm run forum:process
npm run enrich:investigate
node tools/ci/forum-fetch-140352.js --also-latest=30
```
