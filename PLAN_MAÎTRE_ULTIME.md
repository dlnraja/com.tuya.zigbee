# 🚀 PLAN MAÎTRE ULTIME — UNIVERSAL TUYA ENGINE v7.5.8+
## Synthèse Totale : Analyse Profonde, Cartographie, Correction, Enrichissement & Push

> **Date** : 9 Mai 2026  
> **Version Actuelle** : v7.5.8 (master)  
> **Dépôt** : dlnraja/com.tuya.zigbee (740+ commits)  
> **Mode** : Deep-Thinking R1 / Shadow Implementation  
> **Dossier Reference** : `d:/Download/fold/` (16 PDFs analysés)

---

## 📋 SOMMAIRE EXÉCUTIF

**État actuel** : Le projet compte 8960 device IDs indexés dans `driver-mapping-database.json`, 315+ drivers actifs, et 100+ commits de sync communautaire v7.5.8. Le fix #302 (SourceCredits) est déjà appliqué. Aucun dossier `_hybrid` n'est visible. La base de données couvre les fabricants : Tuya, IKEA, Philips, Sonoff, Xiaomi/Aqara, Moes, BSEED, Zemismart, Legrand, Lidl, Schneider, et 100+ autres.

**Bugs critiques résolus** : 
- v7.4.6 : `AdvancedAnalytics.js:215` → parenthèse excédentaire ✅
- v7.4.8 : `tuyaUtils.js:118` → hybride if/ternaire invalide ✅
- #302 : `SourceCredits` MODULE_NOT_FOUND → safe require ✅

**Priorité absolue** : Valider la syntaxe complète, enrichir les drivers, et publier les 2 branches (master + stable-v5) avec les améliorations.

---

## 🗺️ CARTOGRAPHIE COMPLÈTE DES MANUFACTURER NAMES + DEVICE IDs

### Catégorie 1 : TUYA Core (Prefixes `_TZE*`, `_TZ3000*`, `_TYZB*`)

| Prefix | Count Estimé | Usage Principal |
|--------|-------------|-----------------|
| `_TZE200_*` | ~800+ | Modules Tuya DP (capteurs, switches, thermostats) |
| `_TZE204_*` | ~600+ | Modules Tuya DP v2 (nouveaux appareils) |
| `_TZE284_*` | ~200+ | Modules Tuya DP v3 (air quality, mmWave) |
| `_TZE608_*` | ~5+ | Gate openers (#305) |
| `_TZ3000_*` | ~1200+ | Zigbee 3.0 Tuya (switches, prises, capteurs) |
| `_TZ3210_*` | ~400+ | Zigbee variants (eWeLight, etc.) |
| `_TYZB01_*` | ~200+ | Anciens modules Tuya |
| `_TYZB02_*` | ~20+ | Boutons Tuya |

### Catégorie 2 : Fabricants Européens

| Fabricant | Clusters Spécifiques | Drivers Associés |
|-----------|---------------------|------------------|
| **IKEA** (E1743, E1810, LED1623G12, LTW001) | `0xFC7C` | bulb_*, button_wireless_* |
| **Philips Hue** (LCT001, RWL021, SML001) | `0xFC01`, `0xFC03` | bulb_rgb*, motion_sensor |
| **Legrand** (067773, 064882) | `0xFC40` | wall_switch_*, plug_smart |
| **Schneider** (Wiser) | ZCL standard | thermostat_*, switch_* |
| **OSRAM/LEDVANCE** (LIGHTIFY) | ZCL standard | bulb_dimmable |

### Catégorie 3 : Fabricants Asiatiques

| Fabricant | Clusters Spécifiques | Drivers Associés |
|-----------|---------------------|------------------|
| **Xiaomi/Aqara** (LUMI.*) | `0xFCC0` | climate_sensor*, contact_sensor* |
| **Sonoff** (SNZB-*, ZBMINI*) | `0x0B04` + ZCL | plug_smart*, motion_sensor* |
| **Moes** | `0xE000` (hybride) | switch_*, wall_switch_* |
| **BSEED** | `0xE000`/`0xE001` (zcl_only) | wall_switch_* |
| **Zemismart** | `0xE000` (per-endpoint) | dimmer_*, switch_* |
| **Konke** | ZCL standard | button_wireless_* |

### Catégorie 4 : Appareils Spécialisés

| Type | Modèles Clés | Clusters | Action Requise |
|------|-------------|----------|----------------|
| **Air Quality** | `_TZE284_*`, TS0601_air_quality | `0xEF00` (composite DP) | CompositeDataParser |
| **Radars mmWave** | `_TZE204_mmw`, TS0225 | `0xEF00` (haut débit) | ThrottleManager adaptatif |
| **IR Blasters** | Zosung ZS3L, Moes UFO-R11 | `0xE004`/`0xED00` | SessionManager (L9) |
| **Gate Openers** | `_TZE608_c75zqghm` (#305) | `0xEF00` | Nouveau driver windowcoverings |
| **Prises Multi-gang** | TS011F_powerstrip | `0xEF00` + `0x0B04` | Endpoints multiples |
| **Capteurs Sol** | TS0601_soil_multi | `0xEF00` (multi-DP) | Diviseur adaptatif |

### Catégorie 5 : Fabricants & Marques Blanches

| Marque | Exemples | Patterns |
|--------|----------|----------|
| **TUYATEC** | TUYATEC-yg5dcbfu, TUYATEC-abkehqus | `TUYATEC-*` |
| **eWeLink** | EWELIGHT, EWELINK, SONOFF | `*EWE*`, `*SONOFF*` |
| **HOBEIAN** | hobeian, HOBEIAN_10G_MULTI | Fallback générique |
| **IMMAX** | Immax, IMMAX | Valve irrigation |
| **VISONIC** | Visonic, VISONIC | Serrures, sécurité |
| **DLNRAJA** | DLN, DLN-DIY, DLNRAJA | Développeur |

---

## 🔧 BONNES IDÉES & FEATURES EXTRAITES DES COMMITS

### Des 100+ Commits v7.5.8 (Community Syncs)

| # | Feature / Amélioration | Source | Priorité |
|---|------------------------|--------|----------|
| 1 | **1417+ nouveaux fingerprints** | Commits "Community sync v7.5.8" | ✅ Fait |
| 2 | **11 nouvelles variantes air quality** | `33d8c32` (dernier commit) | ✅ Fait |
| 3 | **3784 doublons supprimés** | `ab2097ed0` | ✅ Fait |
| 4 | **PROJECT_INDEX.md** créé | `232b95a33` | ✅ Fait |
| 5 | **Safe require SourceCredits** | Fix #302 | ✅ Fait |
| 6 | **SDK3 getTriggerCard** remplacement | `d7843f7dd` | ✅ Fait |
| 7 | **Security Shield grep** fix | `b002a8047` | ✅ Fait |

### Des PDFs de Référence (Dossier `reference pdf/`)

| # | Feature / Amélioration | Source PDF | Priorité |
|---|------------------------|------------|----------|
| 8 | **Architecture 11 couches RX/TX** | AUDIT COMPLET & PLAN D'ACTION | 🔴 Critique |
| 9 | **Dual-track stable-v5 / master-v7+** | PLAN MAÎTRE DUAL-TRACK | 🔴 Critique |
| 10 | **AI Gateway Multi-provider** | Stratégie Architecturale | 🟠 Élevée |
| 11 | **SessionManager L9 (Zosung IR)** | AUDIT COMPLET | 🔴 Critique |
| 12 | **HealthMonitor L10 (0xFF01)** | AUDIT COMPLET | 🔴 Critique |
| 13 | **SanityFilter L11 (valeurs aberrantes)** | AUDIT COMPLET | 🟠 Élevée |
| 14 | **ManufacturerResolver Rule 24** | REMPLACER LOCALEMENT | 🔴 Critique |
| 15 | **Refactor _hybrid → permissif** | REMPLACER LOCALEMENT | 🔴 Critique |
| 16 | **Scraping mondial multi-langues** | Stratégie Architecturale | 🟠 Élevée |
| 17 | **Orchestration IA coût-optimisée** | Stratégie Multi-IA | 🟡 Moyenne |
| 18 | **SanityFilter glissant** | Opus 4.6 Action Plan | 🟠 Élevée |
| 19 | **Composite DP Parser** | Enrichissement Mondial | 🟠 Élevée |
| 20 | **Adaptive ThrottleManager** | Enrichissement Mondial | 🟠 Élevée |

### Des Dotfiles & Rules (`.clinerule`, `.cursorrules`, `.windsurfrules`)

| # | Feature / Règle | Source | Priorité |
|---|-----------------|--------|----------|
| 21 | **Settings Keys** : `zb_model_id` (pas `zb_modelId`) | .cursorrules | ✅ Appliqué |
| 22 | **Physical Button Detection** (PR#120 pattern) | .cursorrules | ✅ Appliqué |
| 23 | **Double-Division Bug** fix v5.11.15 | .windsurfrules | ✅ Appliqué |
| 24 | **Mains-Powered Sensor** : pas de battery | .windsurfrules | ✅ Appliqué |
| 25 | **ProductValueValidator** : CO2 min=0 | .windsurfrules | ✅ Appliqué |
| 26 | **Phantom Capabilities** : éviter fallback HOBEIAN_10G | .cursorrules | ✅ Appliqué |

---

## 🏗️ PLAN D'EXÉCUTION PAR PHASE

### PHASE 0 : VALIDATION IMMÉDIATE (< 30 min)

**Objectif** : Confirmer l'état actuel et bloquer les régressions.

| Étape | Commande | Vérification |
|-------|----------|-------------|
| V0.1 | `node -e "console.log(require('./app.json').version)"` | v7.5.8 |
| V0.2 | `find lib -name "*.js" -exec node -c {} \;` | 0 erreurs |
| V0.3 | `find drivers -type d -name "*_hybrid" | wc -l` | 0 dossiers |
| V0.4 | `wc -c app.json` | < 7MB |
| V0.5 | `npm audit --audit-level=critical` | 0 critiques |
| V0.6 | `git log --oneline -5` | Derniers commits OK |

### PHASE 1 : CORRECTIFS CRITIQUES (< 1h)

**Objectif** : Appliquer les correctifs identifiés dans les PDFs et diagnostic emails.

| Étape | Fichier | Action | Diff |
|-------|---------|--------|------|
| C1.1 | `lib/utils/manufacturerResolver.js` | Créer (Rule 24) | Nouveau fichier |
| C1.2 | `data/manufacturers.json` | Enrichir variants | Mapping insensible casse |
| C1.3 | `lib/drivers/DynamicDriverMatcher.js` | Index Map O(1) | Remplacer Array.find() |
| C1.4 | `.eslintrc.json` | Renforcer règles | no-unmatched-parens, curly |
| C1.5 | `scripts/validate-all.sh` | Créer | Validation complète |
| C1.6 | `lib/filter/SanityFilter.js` | Créer (L11) | Filtre valeurs aberrantes |
| C1.7 | `lib/health/HealthMonitor.js` | Créer (L10) | Heartbeat 0xFF01 |
| C1.8 | `lib/session/SessionManager.js` | Créer (L9) | Fragmentation IR Zosung |

### PHASE 2 : ENRICHISSEMENT DRIVERS (< 2h)

**Objectif** : Ajouter les drivers manquants identifiés par scraping Blakadder/Z2M.

| Priorité | Type Appareil | Sources | Action |
|----------|--------------|---------|--------|
| 🔴 | Air Quality (PM2.5, CO2) | Blakadder `_TZE284_*` | CompositeDataParser + driver |
| 🔴 | Radars mmWave | Z2M `TS0601_presence` | ThrottleManager adaptatif |
| 🔴 | Gate Opener (#305) | Issue GitHub | Driver windowcoverings |
| 🟠 | IR Blasters Zosung | ZHA quirks | SessionManager (L9) |
| 🟠 | Prises Multi-gang | Blakadder `TS011F` | Endpoints multiples |
| 🟠 | Capteurs Sol | Z2M converters | Multi-DP mapping |
| 🟡 | Serrures Connectées | Blakadder | Driver lock_smart |

### PHASE 3 : CI/CD & AUTOMATISATION (< 1h)

**Objectif** : Déployer les garde-fous qualité.

| Fichier | Rôle | Statut |
|---------|------|--------|
| `.github/workflows/syntax-check.yml` | Validation syntaxe pré-merge | À créer |
| `.github/workflows/dependency-audit.yml` | Audit npm quotidien | À créer |
| `.github/workflows/gmail-diagnostics-anonymize.yml` | Shadow processing | À créer |
| `.husky/pre-commit` | Validation locale | À créer |
| `test/critical/manufacturerResolver.test.js` | Tests Rule 24 | À créer |
| `test/critical/tuyaUtils.test.js` | Tests getModelId | À créer |

### PHASE 4 : PUBLICATION & PUSH (< 30 min)

**Objectif** : Publier les 2 branches validées.

| Étape | Commande | Résultat |
|-------|----------|---------|
| P4.1 | `bash scripts/validate-all.sh` | ✅ Validation OK |
| P4.2 | `git add . && git commit -m "v7.5.9: syntax fixes, L9-L11, drivers enrichment"` | Commit |
| P4.3 | `git push origin master` | Push master |
| P4.4 | `git checkout stable-v5 && git merge master` | Sync branches |
| P4.5 | `git push origin stable-v5` | Push stable |
| P4.6 | `homey app publish --test` | Publication shadow |

---

## 📊 MATRICE DES FABRICANTS ET LEURS IMPLÉMENTATIONS

### Fabricants avec Clusters Propriétaires (Priorité Haute)

| Fabricant | Clusters | Comportement Spécifique | Drivers Concernés |
|-----------|----------|------------------------|-------------------|
| **Tuya** | `0xEF00` (DP) | DataPoints variables par modèle | Tous les `TS0601_*` |
| **Tuya** | `0xE000` (boutons) | cmd0-cmd6, timings variables | `switch_*`, `wall_switch_*` |
| **Xiaomi/Aqara** | `0xFCC0` | Buffer composite `0x00F7`, lifeline | `climate_sensor_*`, `contact_sensor_*` |
| **Philips Hue** | `0xFC01`/`0xFC03` | Entertainment sync, mireds | `bulb_rgb*` |
| **Legrand** | `0xFC40` | Pairing + LED feedback + modes | `wall_switch_*`, `plug_smart` |
| **IKEA** | `0xFC7C` | Répétitions de trames | `bulb_*`, `button_wireless_*` |
| **Sonoff** | `0x0B04` | Electrical measurement | `plug_smart*`, `motion_sensor*` |
| **Zosung** | `0xE004`/`0xED00` | Fragmentation IR longs | `blaster_remote`, `ir_remote` |

### Fabricants sans Cluster Spécifique (ZCL Standard)

| Fabricant | Stratégie | Drivers |
|-----------|-----------|---------|
| SmartThings | ZCL standard + cloud | `motion_sensor_*` |
| Sengled | ZCL standard | `bulb_*` |
| Centralite | ZCL standard | `plug_smart_*` |
| OSRAM/LEDVANCE | ZCL standard | `bulb_dimmable` |
| Schneider | ZCL standard | `thermostat_*` |

---

## 🧠 RÈGLES CRITIQUES DU PROJET (À Respecter)

### Dotfiles Analysis Results

| Fichier | Règle Clé | Action |
|---------|-----------|--------|
| `.cursorrules` | `zb_model_id` (pas `zb_modelId`) | ✅ Appliqué |
| `.cursorrules` | Flow ID: `{driver}_physical_gang{N}_{on\|off}` | ✅ Appliqué |
| `.cursorrules` | PAS `titleFormatted` avec `[[device]]` | ✅ Appliqué |
| `.windsurfrules` | Double-Division fix v5.11.15 | ✅ Appliqué |
| `.windsurfrules` | Mains-powered: pas de battery | ✅ Appliqué |
| `.homeyignore` | Exclut `.github/`, `scripts/`, `docs/` | ✅ Vérifié |
| `.gitignore` | Exclut `tmp/`, `backup/`, `*.pdf` | ✅ Vérifié |
| `.clinerules` | Shadow implementation obligatoire | ✅ Appliqué |

### Règles d'Architecture (des PDFs)

| Règle | Description | Impact |
|-------|-------------|--------|
| **Rule 1.1** | Déduplication: isAppCommand=true → UI only, pas de Flow | Zéro boucle infinie |
| **Rule 1.2** | Physique: isAppCommand=false → déclencher Flow | Trigger correct |
| **Rule 1.3** | Zero-Defect: triggerCapabilityListener() pour actions | Commande réelle |
| **Rule 2.1** | Timing: fenêtre 1.5s, debounce 200ms | Anti-rebond |
| **Rule 24** | ManufacturerResolver: normalisation insensible casse | Matching fiable |
| **Rule 21** | Filtrage Flow Cards par capacité | Interopérabilité |

---

## 🔍 PLAN DE RECHERCHE POUR GEMINI FLASH / AI

### Instructions d'Investigation

1. **Analyse Statique** : Parser AST tous les fichiers lib/*.js, calculer complexité cyclomatique, détecter patterns dangereux
2. **Analyse des Logs** : Extraire tous les Log IDs des 6 derniers mois, clusteriser par type d'erreur
3. **Benchmark** : Mesurer temps de chargement app.json, temps de matching fingerprints (O(n) vs O(1))
4. **Sécurité** : npm audit, détection secrets hardcoded, validation permissions
5. **Forum** : Scraper thread #140352 pour extraire demandes non résolues, classer par catégorie

### Sources Prioritaires

| Source | URL | Usage |
|--------|-----|-------|
| Blakadder | zigbee.blakadder.com | Fingerprints, device specs |
| Z2M Converters | github.com/Koenkk/zigbee-herdsman-converters | DP mappings |
| ZHA Quirks | github.com/zigpy/zha-device-handlers | Patterns propriétaires |
| Forum Homey | community.homey.app/t/140352 | Retours utilisateurs |
| Tuya Developer | developer.tuya.com | Specs officielles |

---

## ✅ CHECKLIST FINALE D'EXÉCUTION

### Pré-Push
- [ ] `find lib -name "*.js" -exec node -c {} \;` → 0 erreurs
- [ ] `npx homey app validate --level=publish` → PASS
- [ ] `homey app build` → Archive générée
- [ ] `wc -c app.json` → < 7MB
- [ ] `find drivers -type d -name "*_hybrid" | wc -l` → 0

### Post-Push
- [ ] Workflows CI/CD passent sur GitHub
- [ ] Monitoring crash reports 48h
- [ ] Documentation mise à jour

### Monitoring Continu
- [ ] 0 crash reports SyntaxError
- [ ] Taux démarrage >99.9%
- [ ] Vulnérabilités npm = 0 critiques
- [ ] Couverture tests >70% modules critiques

---

> **Prochaine action immédiate** : Exécuter Phase 0 (validation), puis Phase 1 (correctifs), puis Phase 4 (push). Le plan est conçu pour être exécutable étape par étape par une IA avec accès au dépôt.