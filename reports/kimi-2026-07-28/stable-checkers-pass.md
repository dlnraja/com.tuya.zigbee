# Stable-v5 — passe des checkers + dashboards (2026-07-28)

> Cible : `C:/Users/Dell/Documents/homey/stable` (branche stable-v5, v5.12.29). **Aucun commit/push git.**
> Fait suite à `backport-ondeleted-destroyed.md` (même dossier).

## 1. Gate M14 résolu — validateurs 3/3

- `stable/CHANGELOG.md` : entrée `## [5.12.29] - 2026-07-27` (date du dernier commit stable
  `7b2c576a3`, vérifiée via `git log -1 --format=%ad`) insérée en tête, résumant la ligne stable
  (backports onDeleted issue #513, gardes `_destroyed`, sync P52). Historique 9.0.x conservé en dessous.
- `stable/.homeychangelog.json` : entrée `5.12.29` ajoutée en tête du tableau `changelog`
  (c'est ce fichier que lit le gate M14 de `scripts/validate/homey-mandatory-check.js`).
- `node scripts/_validate_all.js` : **3/3, exit 0** (avant : 2/3, échec M14).
  50 checks OK, 0 erreur, 2 warnings préexistants (O20 champ `api`, M09 255 manufacturerName
  synthétiques à prune par prepare-publish).

## 2. Checkers exécutés un par un (timeout 110 s chacun)

Tous vérifiés read-only avant exécution (`grep writeFileSync`). Les deux validateurs qui écrivent
(`verify_fingerprints_integrity.js`, `app-json-dual-layer-validator.js`) ne le font qu'avec `--fix` —
lancés **sans** `--fix`.

| Checker | Rôle | OK/KO | Enseignement |
|---|---|---|---|
| `scripts/_validate_all.js` | Gate global (mandatory + broken requires + driver mesh) | **OK 3/3** | M14 résolu par l'entrée changelog |
| `scripts/PRE_COMMIT_CHECKS.js` | Gate pré-commit (syntaxe JS, SDK v3, workflows) | **OK** | PASSED avec warnings (NaN-safety consultatif, cache actions v4 dans 1 workflow) |
| `scripts/check-build.js` | Statut du dernier build via API Athom | **OK** (exit 0) | Info : build distant 9.0.8 `processing_failed` côté serveur — état Athom, pas le code local |
| `scripts/check-deps.js` | Dépendances manquantes | **OK** | Sortie `[]` |
| `validation/validate-driver-mesh.js` | Mesh structurel des 431 drivers | **OK** | 0 erreur, 0 warning |
| `validation/comprehensive-recursive-validator.js` | Audit SDK3/Zigbee récursif | **OK** | 431/431 drivers, 1296 checks, 0 erreur, 262 warnings |
| `validation/pre-commit-fp-sync.js` | Cohérence driver.compose.json ↔ app.json | **OK** | 0 erreur |
| `validation/check-destroyed-guard.js` | Gardes `_destroyed` (gate du backport) | **OK** | 0 erreur, 12 warnings « raw setCapabilityValue » préexistants |
| `validation/check-super-ondeleted.js` | Chaîne super dans les overrides lifecycle | **OK** | 0 erreur, 5 warnings `onUninit` préexistants (ne couvre pas le pattern #513 — connu) |
| `validation/check-mixin-order.js` | Ordre des mixins | **OK** | 0 erreur |
| `validation/check-homey-timer-context.js` | Contexte `this` des timers Homey | **OK** | Passed |
| `validation/check-google-assistant-voice-safety.js` | Caps `button.*` event-only | **OK** | 637 caps vérifiées |
| `validation/check-wifi-lifecycle.js` | Lifecycle drivers WiFi | **OK** | 0 erreur, 16 warnings (`markAppCommand` manquant) |
| `validation/check-circuit-breaker.js` | Appels réseau sans CircuitBreaker | **OK** | 10 warnings consultatifs (non bloquant) |
| `validation/check_git_conflicts.js` | Marqueurs de conflit git | **OK** | Aucun |
| `validation/verify_flows_integrity.js` | Intégrité des flows | **OK** | 0 erreur |
| `validation/find-broken-requires.js` | Requires cassés dans lib/ | **OK** | 2 faux positifs connus (`BatteryMasterEngine.js:./LowLevelBridge`, `tuya-engine/index.js:./traits` — identiques à master, déjà documentés) |
| `validation/audit-all-require-paths.js` | Audit des 2967 chemins relatifs | **OK** | Mêmes 2 faux positifs connus |
| `validation/audit_architecture.js` | Architecture (caps batterie wifi, divisions) | **OK** | Warnings : 10+ drivers `wifi_*` ne retirent pas les caps batterie ; 21 divisions hardcodées |
| `validation/check-fingerprint-health.js` | Santé des fingerprints | **OK** | Warn : les 4 templates génériques à `manufacturerName` vide (voir ci-dessous) |
| `validation/app-json-dual-layer-validator.js` | Double couche app.json ↔ compose | **KO** | **Faux positifs checker** : exige `sdkVersion` (SDK v3 utilise `"sdk": 3` — présent) et flague les 4 templates génériques exemptés par M09. Checker obsolète, à durcir hors stable |
| `validation/audit-anti-generic.js` | Heuristique anti-générique | **KO** (exit 1) | Score 81 % « GOOD » ; 37167 « collisions » MFR+PID **théoriques** (heuristique), 1 driver « blocking » (`lcdtemphumidluxsensor`, throw potentiel dans onNodeInit). Audit consultatif |
| `validation/check-driver-collisions.js` | Collisions mfr+pid entre drivers | **KO** | 1455 lignes de collisions — voir §4 erreurs métier |
| `validation/check-pairing-collisions.js` | Collisions bloquant le pairing | **KO** | Sous-ensemble du précédent : paire `water_valve_garden`/`water_valve_smart` sur `_TZE284_vuwtqx0t` (7 combinaisons) |
| `validation/check-energy-divisor.js` | Diviseurs énergie (smartDivisor) | **KO** | Drivers sans `smartDivisor` ni diviseur explicite (ex. `wall_socket`) — métier, documenté §4 |
| `validation/check-ts0601-catchall.js` | Catch-all TS0601 sans restriction | **KO** | `wall_switch_5_gang_tuya` : TS0601 en productId sans `manufacturerName` (un des 4 templates génériques) — métier, documenté §4 |
| `validation/verify_fingerprints_integrity.js` | Cohérence fingerprints.json ↔ compose | **KO** | 1 erreur métier : `_TZE200_ntcy3xu1` absent de `smoke_detector_advanced/driver.compose.json` — documenté §4 |
| `validation/check-driver-health.js` | Santé complète des drivers | **TIMEOUT** | > 110 s (2488 fichiers scannés, pas de verdict rendu) |

**Bilan : 28 exécutés — 20 OK, 7 KO (exit 1), 1 timeout.** 9 fixers skippés (écritures) :
`auto-fix-all.js`, `auto-fix-common-issues.js`, `deep-flow-fix.js`, `deploy-safe-set-capability.js`,
`ensure-case-variants.js`, `fix-button-capability-options.js`, `fix-flow-card-spam.js`,
`fix-flows-schemas.js`, `ultimate-flow-fix.js`.

## 3. Dashboards — backport du fix shared-collector

Le bug corrigé sur master existait dans stable : `collectFingerprintMetrics()` lisait
`data/fingerprints.json` (**53 clés** — fichier quasi vide présent aussi sur master) au lieu de la
vraie base `data/mfs_db.json` (**4220 entrées** sous `devices`).

Fix backporté dans `stable/scripts/dashboard/shared-collector.js` (calqué sur master) :
- `data/mfs_db.json` en tête de `fpPaths` ;
- `extractEntries()` (déballage du wrapper `devices`) ;
- comptage mfr/pid robuste (`manufacturerName || manufacturerId`, valeurs non-tableaux, `modelIds`).

Vérification : `collectFingerprintMetrics()` → **totalDB 4220** (avant : 53), source
`data/mfs_db.json`, 4152 mfr uniques, 228 pid uniques. `node --check` OK.
Read-only vis-à-vis des données (le collector ne fait que lire ; seuls les HTML sont régénérés).

Les 6 dashboards régénérés un par un, exit 0 : `generate-master-dashboard.js`,
`generate-driver-dashboard.js`, `generate-coverage-dashboard.js`,
`generate-dependency-dashboard.js`, `generate-error-dashboard.js`,
`generate-performance-dashboard.js`. « 4,220 » vérifié présent dans
`master-dashboard.html`, `driver-dashboard.html`, `coverage-dashboard.html`,
`performance-dashboard.html` (les dashboards dependency/error n'affichent pas ce compteur).

## 4. Erreurs MÉTIER révélées — documentées, NON corrigées (discipline stable)

1. **Collisions `water_valve_garden` ↔ `water_valve_smart`** : `_TZE284_vuwtqx0t` (× 7 productIds)
   présent dans les deux drivers. Sur master, le FP n'est que dans `water_valve_smart` (retiré de
   `water_valve_garden`). Candidat backport futur (nettoyage FP, hors pattern crash backporté).
2. **`_TZE200_ntcy3xu1` manquant** dans `drivers/smoke_detector_advanced/driver.compose.json`
   (présent sur master ligne 67, et présent dans `data/fingerprints.json` de stable).
   `verify_fingerprints_integrity.js --fix` le réparerait — non lancé (écrirait dans drivers/).
3. **Diviseurs énergie absents** dans plusieurs drivers (ex. `wall_socket`) : ni `smartDivisor: true`
   ni diviseur explicite sur les DP énergie.
4. **`wall_switch_5_gang_tuya`** : `TS0601` en productId sans `manufacturerName` (catch-all) ;
   c'est aussi l'un des 4 templates génériques à `manufacturerName` vide (avec
   `device_radiator_valve_smart`, `dimmable_recessed_led`, `valvecontroller`) — exemptés par M09
   mais flagués par les validateurs standalone.
5. **Warnings structurels préexistants** : 10+ drivers `wifi_*` ne retirent pas les caps batterie
   sur secteur ; 16 listeners WiFi sans `markAppCommand` ; 21 divisions hardcodées.

Aucune ne correspond au pattern des fixes backportés (crash onDeleted/_destroyed) → aucune
correction de masse sur stable.

## 5. Fixes appliqués (3 fichiers)

| Fichier | Fix |
|---|---|
| `stable/CHANGELOG.md` | Entrée `## [5.12.29] - 2026-07-27` en tête (ligne stable documentée) |
| `stable/.homeychangelog.json` | Entrée `5.12.29` dans le tableau `changelog` → **gate M14 passe** |
| `stable/scripts/dashboard/shared-collector.js` | Backport fix master : source `mfs_db.json` + `extractEntries` → dashboards 53 → **4220** fingerprints |

+ 6 HTML de dashboards régénérés (artefacts attendus). Aucun commit/push git.
