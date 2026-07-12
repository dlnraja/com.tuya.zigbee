# 🎯 MASTER_TODO — Plan d'action consolidé 2026-07-10

**Investigation mega-comprehensive terminée.** Voici **toutes les actions** classées par urgence + effort, avec la personne responsable et le temps estimé.

---

## 🔥 P0 — URGENT (à faire dans les 5 prochaines minutes)

| # | Action | Qui | Temps | Statut | Commande / Path |
|---|--------|-----|-------|--------|-----------------|
| 1 | **Merger PR #508** (5 Volta bugs + 2s complement + AOYAN 6 switches + SONOFF S61SZBTPB + 30+ titleFormatted) | Dylan | 2 min | ⏳ | https://github.com/dlnraja/com.tuya.zigbee/pull/508 |
| 2 | **Merger PR #509** (FP `_TZ3000_fllyghyj` air_purifier → climate_sensor) | Dylan | 1 min | ⏳ | https://github.com/dlnraja/com.tuya.zigbee/pull/509 |
| 3 | **Merger PR #510** (rename soil_sensor FPs myd45weu) | Dylan | 1 min | ⏳ | https://github.com/dlnraja/com.tuya.zigbee/pull/510 |
| 4 | **Bumper versions** master v9.0.190 → v9.0.193 + stable v5.11.219 → v5.11.220 | Dylan | 30s | ⏳ | `node tools/ci/push-helper.js master` puis copier-coller |
| 5 | **Push tags** `v9.0.193` + `v5.11.220` pour déclencher auto-publish | Dylan | 30s | ⏳ | `git push origin v9.0.193 v5.11.220` |
| 6 | **Watch** `.github/workflows/publish.yml` (~8-10 min) | Auto | 10 min | ⏳ | https://github.com/dlnraja/com.tuya.zigbee/actions |
| 7 | **Verify** sur dev dashboard | Dylan | 1 min | ⏳ | `node tools/ci/homey-dashboard-check.js` (25+ checks) |

**Temps total : 5 min actif + 10 min watch**

---

## 🟠 P1 — Cette semaine (1-2 jours)

### A. Fix bugs dans le code (auto-fixable)

| # | Bug | Path | Effort | Source |
|---|-----|------|--------|--------|
| A1 | 7 drivers avec manufacturerName vide | `dimmable_led_strip`, `light_bulb_rgb_led`, `plug`, `rgb_led_strip`, `rgb_mood_light`, `rgb_wall_led_light`, `tunable_bulb_E14` | 30 min | deep-code-audit.js |
| A2 | 5 drivers "Mains but has battery" inconsistency | `air_purifier_soil`, `device_air_purifier_soil`, `sensor_contact_climate`, `sensor_lcdtemphumidsensor_soil`, `smoke_detector_advanced` | 1h | deep-code-audit.js |
| A3 | `UnifiedBatteryHandler` ne scanne que endpoint[1] | `lib/UnifiedBatteryHandler.js:_findEndpointByCluster` | 2h | BATTERY_ANALYSIS.md |
| A4 | `UnifiedBatteryHandler._isKineticDevice()` over-match TS004x | `lib/UnifiedBatteryHandler.js:_isKineticDevice` | 1h | BATTERY_ANALYSIS.md |
| A5 | `UnifiedBatteryHandler.checkMainsPowered()` logic flaw | `lib/UnifiedBatteryHandler.js:checkMainsPowered` | 1h | BATTERY_ANALYSIS.md |
| A6 | 100+ duplicate object properties | scan `node .github/scripts/bug-investigator.js --type=dup-prop` | 4h | bug-hunter.js |
| A7 | 50+ `.catch(this.error)` sans binding | `node .github/scripts/bug-investigator.js --type=unbound-catch` | 2h | bug-hunter.js |
| A8 | 100+ capabilitiesOptions warnings | `node .github/scripts/audit-capabilities.js` | 4h | audit-capabilities.js |

### B. Fix scripts CI (3 bugs identifiés)

| # | Bug | Path | Fix |
|---|-----|------|-----|
| B1 | `misplaced-fp-detector.js` cherche `homey/drivers` au lieu de `homey/master/drivers` | `.github/scripts/misplaced-fp-detector.js:6` | Changer `const DD = 'drivers';` → `const DD = path.join(__dirname, '..', '..', 'drivers');` |
| B2 | `pattern-detector.js` charge 0 forum posts (pas de token Discourse) | `.github/scripts/pattern-detector.js` | OK en local, OK en CI (a DISCOURSE_API_KEY) |
| B3 | `protocol-pattern-detector.js` et `adaptive-dp-detector.js` silent | — | Besoin d'args ou fix |

---

## 🟡 P2 — Ce sprint (1-2 semaines)

### C. Résoudre les 241 PID conflicts (74 HIGH)

**Top 14 HIGH conflicts (par nombre de drivers):**
1. **TS011F** → 45 drivers (fan/sensor/socket/doorbell/button/light/other) — class par ID + 1 seul OK
2. **TS0001** → 34 drivers
3. **Excellux** → 31 drivers (sensor/fan/light/socket/windowcoverings)
4. **TS0215A** → 28 drivers (sensor/button/socket/light/remote/other)
5. **TS0002** → 25 drivers
6. **TS0726** → 21 drivers (windowcoverings/light/sensor/socket)
7. **TS0003** → 20 drivers
8. **TS0225** → 19 drivers (fan/sensor/socket/other)
9. **TS0505B** → 18 drivers (light/other)
10. **TS004F** → 19 drivers (button/sensor/doorbell/socket/remote/other)
11. **TS0201** → 18 drivers (fan/sensor/light/socket/thermostat/other)
12. **TS110E** → 18 drivers (light/socket/sensor/other)
13. **TS0043** → 17 drivers
14. **TS0013** → 15 drivers

**Action** : Appliquer la règle "Sacred Couple" (mfr + PID) + driver priority (highest wins). Script : `node .github/scripts/cross-driver-gap.js` + revue manuelle pour les 14 HIGH.

### D. Ajouter 4433 missing variants

**Source** : herdsman cache vs canonical DB. **Action** : `node .github/scripts/variant-scanner.js --apply` (auto), puis revue des ajouts.

### E. Résoudre 98 flow issues

**Source** : `cross-ref-intelligence.js`. **Action** : `node .github/scripts/cross-ref-intelligence.js --fix` (si disponible) + revue manuelle.

### F. Adopter les features Tuya Cloud (P1+)

D'après `TUYA_CLOUD_APP_INSPIRATION.md` :

| Feature | Effort | Valeur |
|---------|--------|--------|
| Generic DP triggers (boolean/number/string/json) | 2 jours | 🔥🔥🔥 (top demande) |
| Generic DP actions (send_command) | 2 jours | 🔥🔥🔥 |
| Knob rotation triggers (CW/CCW) | 1 jour | 🔥🔥 |
| Child lock action (circuit breakers) | 4h | 🔥 |
| Sensor sensitivity setting | 4h | 🔥 |
| Fan light separate control | 4h | 🔥 |
| Light standby setting | 2h | 🔥 |

---

## 🟢 P3 — Ce mois

### G. Re-vérifier les flow cards titleFormatted

**Inconsistance** : PR #508 ajoute 30+ `titleFormatted`, mais 3 IDE rules (`.clinerules`/`.windsurfrules`/`.cursorrules`) disent "NO titleFormatted with [[device]] in triggers". **Action** : ouvrir un ticket, faire reviewer par toi.

### H. Configurer Gmail OAuth (pour diagnostics automatiques)

**Problème** : `gmail-token-health.json` → `missing_gmail_credentials`. **Action** :
1. Créer un Google Cloud project
2. Activer Gmail API
3. Créer OAuth client ID/Secret
4. Set GitHub Secrets : `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
5. Re-run `node .github/scripts/verify-gmail-setup.js`

### I. Nettoyer les "orphan drivers" (59)

**7 drivers avec `no_manufacturer_names`** :
- `dimmable_led_strip`, `light_bulb_rgb_led`, `plug`, `rgb_led_strip`, `rgb_mood_light`, `rgb_wall_led_light`, `tunable_bulb_E14`

**13 drivers avec `no_fingerprints`** (WiFi fleet) :
- `presence_detector`, `radiator_wifi_tuya`, `wifi_air_purifier`, `wifi_air_quality`, `wifi_camera`, `wifi_cover`, `wifi_dehumidifier`, `wifi_dimmer`, `wifi_doorbell`, `wifi_door_lock`, ...

**Action** : Décider si on garde (WiFi legacy) ou on supprime. Si on garde, ajouter au moins 1 manufacturerName pour pas être "orphan".

### J. Updater le canal CI

**Action** : Mettre à jour le `cron shadow-mode-runner` selon la fréquence d'investigation :
- **Daily** : `0 2 * * *` (2h du matin, après auto-publish)
- **Weekly** : `0 2 * * 0` (dimanche 2h, après gmail-diagnostics)
- **Monthly** : `0 2 1 * *` (1er du mois)

**Réponse en attente de Dylan** : Daily / Weekly / Monthly ?

---

## 🔵 P4 — Long terme (ce trimestre)

### K. Installer Git pour Windows (optionnel mais utile)

Permettrait à Mavis de `git push` automatiquement. URL : https://git-scm.com/download/win

### L. Activer Computer Use dans Mavis

Permettrait l'automatisation desktop (browser, IDE). Toggle dans Mavis settings.

### M. Adopter le mode shadow unifié

**Mode shadow strict actuel** : `upstreamMerge:false / ownMerge:true / ownClose:false / ownComment:true`. **Action** : créer un `docs/SHADOW_POLICY.md` qui documente ce mode + ajoute la signature `<!-- diag-resolver -->`.

### N. Créer un dashboard web (optionnel)

Pour visualiser les métriques shadow mode. Stack : Node + SQLite + simple HTML. Path : `tools/dashboard/`.

---

## 📊 Métriques de succès

| Métrique | Avant | Après P0 | Cible P1 | Cible P2 |
|----------|-------|----------|----------|----------|
| Drivers healthy (driver-health) | 0/430 | 0 | 50+ | 200+ |
| Critical drivers (<50/100) | 52 | 52 | <20 | <5 |
| Empty manufacturerName | 7 | 7 | 0 | 0 |
| Mains-with-battery inconsistencies | 5 | 5 | 0 | 0 |
| Mojibake chars | 0 (fixed) | 0 | 0 | 0 |
| `zb_product_id` violations | 0 (fixed) | 0 | 0 | 0 |
| PID conflicts HIGH | 74 | 74 | <40 | <10 |
| Missing variants | 4433 | 4433 | <2000 | <500 |
| Flow issues | 98 | 98 | <30 | 0 |
| Avg publish time | ~10 min | ~10 min | ~8 min | ~5 min |
| Auto-fix rate (publish) | 70% | 70% | 85% | 95% |

---

## 📂 Rapports sauvegardés (7 fichiers)

Tous dans `tools/ci/diagnostics/*-2026-07-10.txt` :

1. `audit-capabilities-report-2026-07-10.txt` (22.3K) — 100+ capabilitiesOptions warnings
2. `bug-hunter-report-2026-07-10.txt` (282.4K) — 100+ dup props, 50+ unbound .catch
3. `conflict-audit-2026-07-10.txt` (10.9K) — 241 PID conflicts (74 HIGH, 23 MEDIUM)
4. `cross-ref-intelligence-2026-07-10.txt` (88B) — 98 flow issues
5. `deep-code-audit-2026-07-10.txt` (625B) — 12 warnings
6. `driver-health-report-2026-07-10.txt` (1.2K) — 52 critical drivers
7. `fp-collision-2026-07-10.txt` (53B) — 0 mfr+pid duplicates (real risk)
8. `variant-scanner-2026-07-10.txt` (439B) — 16 variants found, 4433 missing

---

## 🛠️ Outils créés (à utiliser)

| Path | Description | Usage |
|------|-------------|-------|
| `tools/ci/push-helper.js` | Pre-flight + copy-paste git commands | `node tools/ci/push-helper.js master` |
| `tools/ci/homey-dashboard-check.js` | 25+ verification checks | `node tools/ci/homey-dashboard-check.js` |
| `tools/ci/prevent-apply-patch-corruption.js` | 11 mojibake patterns | `node tools/ci/prevent-apply-patch-corruption.js --install-hook` |
| `tools/shadow-mode/shadow-mode-v2.js` | Continuous framework | `node tools/shadow-mode/shadow-mode-v2.js --all` |
| `tools/shadow-mode/state.json` | 8 runs, 363 tickets, 5400 fixes | (read-only) |

---

## ⏱️ Temps total estimé

| Phase | Temps actif | Temps wall clock |
|-------|-------------|------------------|
| P0 (merge+publish) | 5 min | 15 min (10 min CI) |
| P1 (fixes) | 1-2 jours | 1-2 jours |
| P2 (sprint) | 1-2 semaines | 1-2 semaines |
| P3 (mois) | 1 mois | 1 mois |
| P4 (trimestre) | 3 mois | 3 mois |

---

**Dernière mise à jour** : 2026-07-10 22:50 (Europe/Paris)
**Auteur** : Mavis investigation mega-comprehensive
**Version** : 1.0
