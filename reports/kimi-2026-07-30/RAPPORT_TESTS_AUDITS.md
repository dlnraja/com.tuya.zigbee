# 📊 Rapport complet — Tests, audits et corrections (2026-07-29 → 2026-07-30)

> Sessions de travail sur `com.dlnraja.tuya.zigbee` (master + stable-v5).
> Versions : master **9.0.361 → 9.0.371** · stable **5.12.29 → 5.12.35**
> Tests : master **173 → 265** · stable **110 → 176** (0 échec partout)

---

## 1. Inventaire des vérifications automatisées

| Vérification | Portée | Résultat |
|---|---|---|
| Suite mocha master | 34 fichiers de test | **265/265 ✓** |
| Suite mocha stable | 30 fichiers de test | **176/176 ✓** |
| `homey app validate --level publish` | master + stable | ✓ ×2 |
| YAML (workflows + tous .yml) | 73 fichiers | **73/73 ✓** |
| Syntaxe JS (`vm.Script`, en-processus) | 15 781 scannés / 2 529 dans le périmètre | **0 invalide** |
| Smoke-test chargement lib | 577 modules | **577/577 ✓** |
| Smoke-test chargement drivers | 431 device.js | **431/431 ✓** (10 corrigés) |
| Security scanner (secrets, artefacts) | repo complet | **CLEAN** |
| Tests exécutés 1 par 1 | 31 fichiers | tous verts (1 anomalie de comptage corrigée) |
| PR gate (versions + Sacred Couple + locales) | outil `pr-gate.js` | ✓ |
| Cohérence driver ↔ mfs_db | 4 300+ entrées | ✓ (+rapport dual-claims) |
| Anti-purge empreintes | toute empreinte mfs_db appairable | ✓ |
| Couverture vs upstream Johan | 113 drivers, 1920 FPs | superset complet |
| Couverture vs ZHA (zha-device-handlers) | 489 FPs Tuya | 486/489 → 3 importées |
| Couverture vs deCONZ DDF | échantillon | complet |

## 2. Bugs réels corrigés (29)

### Pairing / routage / empreintes
1. **#513** — sonde externe DP38 ×10 trop basse : `measure_temperature.probe` absent du SmartDivisor + validateur qui corrigeait ÷100 au lieu de ÷10 (master+stable, test de régression)
2. TS0044 `_TZ3000_u3nv1jwk` revendiqué par un driver désactivé (double claim supprimé, stable)
3. `_TZE204_clrdrnya` volé par `motion_sensor_radar_mmwave` (stable)
4. `_TZE204_r0jdjrvi` volé par `presence_sensor_radar` (stable)
5. `wall_switch_4gang_1way` sans capabilities button.1-4 (stable)
6. Régression #183 : `_TZ3000_flonmact` purgée → ré-ajoutée (master+stable)
7. #395 : `_TZE200_9xfjixapv` absente → ajoutée (master+stable)
8. Route mfs_db `_TZE200_FJJBHX9D` (switch, pas climate) corrigée
9. Filtre flow fantôme `bulb_rgb_cct` → `led_controller_cct` (natural_light, master+stable)
10. IDs fabricant **corrompus** Giex GX04 (`_TZE2841000000_*`, source ZHA) ajoutés à soil_sensor
11. `_TZE204_kwi6bbk4` (source ZHA) ajouté à climate_sensor

### Scaling / valeurs
12. SmartDivisor : résolution par préfixe des sub-capabilities (cause racine #513)
13. Cache diviseur **auto-validant** (anti-empoisonnement, zéro jamais appris, cross-protocole gardé)
14. Batterie `_TZE284_vvmbj46n` : ÷2 au lieu de ×2 (50 → 25% au lieu de 100%)
15. ProductValueValidator : préférait le plus grand diviseur (215 → 2.15 au lieu de 21.5) + mutation des règles partagées
16. **`toHumidity`** : 65 lu 1%, 650 lu 7% → heuristique par magnitude
17. **`toTemperature`** : retournait 215°C impossible → null
18. Estimation batterie : doublement 0-50 appliqué à tout le monde (40% → 80%) → restreint aux fabricants curés
19. Duplicata `smartDivisorDetect` (heuristique DP appliquée au contexte ZCL) → parser **spec-exact** 0.01 unités

### Batterie / boutons SOS
20. SOS : pourcentage ZCL mal normalisé (règle « >100 alors ÷2 »)
21. SOS : voltage ZCL 100mV lu comme des volts (30 = 3.0V lu « 30V »)
22. SOS : pas de listener `button.1` (« Missing Capability Listener »)

### IAS / enrôlement
23. `retryIASEnrollment` écrivait une **adresse CIE nulle** (cassait l'enrôlement) + jamais appelé
24. Appareils endormis jamais enrôlés → retries différés 30s/120s

### Drivers cassés au chargement (corruption bot)
25-34. 8× `require()` nu sans assignment, 1× `constrequire`, 2× shorthand `{ cap }`, 37× shorthand `{ capability }` dans UniversalTuyaParser (module mort depuis sa création)

### CI / outillage
35. Résolveur : spam de commentaires (état gitignoré) → dédup par commentaires + escalade `needs-maintainer`
36. Bot P52 : versions `x.y.z-stable` **impubliables** chaque jour
37. Fichiers d'état trackés malgré la policy sécurité → cache CI
38. Facturation IA : providers payants appelés sans plafond → coupe-circuit (paid opt-in, caps journaliers, cap global)
39. Désynchronisation de version package/app (9.0.365 vs 9.0.366)

## 3. Livraisons outillage & docs

- `reports/community-inbox.md` + workflow quotidien (digest issues/PRs/forum)
- `housekeeping.yml` hebdomadaire + `repo-housekeeping.js` (12 fichiers rangés, règles sûres)
- `scripts/_registry.json` (1042 scripts recensés)
- `docs/INDEX.md` auto-généré (156 docs) + `FORUM_HUB.md` + `GITHUB_HUB.md` + `CONTRIBUTING_DEV.md`
- `docs/EXTERNAL_APPS_ANALYSIS.md` (politique d'import sans copie)
- `docs/IMPROVEMENT_PROGRAM.md` (~500 items suivis)
- GitHub Pages enrichie : nav unifiée + page Community Inbox (vérifiée en ligne)
- Outils CI : `pr-gate.js`, `js-syntax-audit.js` (20s/15 781 fichiers), `lib-smoke-test.js`, `drivers-smoke-test.js`, `dead-module-audit.js`, `kg-query.js`, `locale-completeness.js`, `fix-mojibake.js`, stub SDK `homey`
- i18n : 9 locales complétées (+14 clés chacune), `pt.json`/`cs.json` créés, **2189 corrections mojibake** dans 190 fichiers
- Legacy archivé avec snapshot (61K)

## 4. Évolution des suites de tests

| Branche | Avant | Après | Nouveaux tests |
|---|---|---|---|
| master | 173 | **265** | probe, scaling (10), batterie/SOS (9), housekeeping (6), billing (6), i18n/cohérence (6), flow cards (5), anti-purge (1), fingerprint-DB (6), converters Z2M (14), AdaptiveDataParser (13), manufacturerResolver (12 comptés), ZCL parser (4) |
| stable | 110 (4 échecs pré-existants) | **176** | backports de toutes les suites ci-dessus |

## 5. Commits

master : `P92.28` → `P92.45` (+ commits CI auto) · stable-v5 : 8 backports
gh-pages : refonte index + inbox · workflows : `community-inbox.yml`, `housekeeping.yml`, `pr-gate.yml`

---

*Rapport généré le 2026-07-30 — vérifiable : `npm test` (2 branches), `node tools/ci/pr-gate.js`, audits dans `.github/state/`.*
