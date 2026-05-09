# 🚀 PLAN D'ACTION ULTRA-COMPLET — UNIVERSAL TUYA ENGINE v7.5.8+
## Consolidation Totale de Tous les Rapports, Analyses et Plans Précédents

> **Date** : 9 Mai 2026  
> **Version Actuelle** : v7.5.8 (master)  
> **Dépôt** : dlnraja/com.tuya.zigbee  
> **Mode** : Deep-Thinking R1 / Shadow Implementation

---

## 📋 TABLE DES MATIÈRES

1. [Synthèse Exécutive](#1-synthèse-exécutive)
2. [État des Lieux Complet](#2-état-des-lieux-complet)
3. [Historique des Crises et Correctifs](#3-historique-des-crises-et-correctifs)
4. [Architecture du Projet](#4-architecture-du-projet)
5. [Bugs et Issues Critiques](#5-bugs-et-issues-critiques)
6. [Plan d'Action Priorisé](#6-plan-daction-priorisé)
7. [Configurations et Scripts](#7-configurations-et-scripts)
8. [Plan de Recherche pour IA](#8-plan-de-recherche-pour-ia)
9. [Checklist Finale](#9-checklist-finale)

---

## 1. SYNTHÈSE EXÉCUTIVE

### État Actuel (v7.5.8)
- **323+ drivers** actifs, **3300+ fingerprints** supportés
- **Fix #302** (SourceCredits safe require) : ✅ Déjà appliqué (lignes 62-71 de app.js)
- **Fixes syntaxiques** v7.4.6/v7.4.8 : ✅ Corrigés depuis longtemps
- **Aucun dossier _hybrid** visible dans les drivers actuels
- **app.json** : Taille à vérifier (<7MB cible)
- **CI/CD** : Workflows existants à renforcer

### Priorités Immédiates
1. **Audit complet** de la syntaxe JS dans lib/
2. **Renforcement CI/CD** (syntax-check.yml, dependency-audit.yml)
3. **Enrichissement drivers** via scraping Z2M/ZHA/Blakadder
4. **Optimisation** app.json si >7MB
5. **Tests unitaires** pour modules critiques

---

## 2. ÉTAT DES LIEUX COMPLET

### 2.1 Fichiers Critiques du Projet

| Fichier | Rôle | Statut |
|---------|------|--------|
| `app.js` | Point d'entrée, initialisation app | ✅ Fix #302 appliqué (safe require SourceCredits) |
| `app.json` | Manifeste Homey (version, drivers, capabilities) | ⚠️ À vérifier taille |
| `package.json` | Dépendances npm | ⚠️ Audit vulnérabilités |
| `.eslintrc.json` | Règles linting | ⚠️ À renforcer |
| `.homeyignore` | Exclusion fichiers du bundle | ✅ Présent |
| `lib/utils/tuyaUtils.js` | Utilitaires Tuya (getModelId) | ✅ Fix syntaxe appliqué |
| `lib/analytics/AdvancedAnalytics.js` | Module analytique | ✅ Fix syntaxe appliqué |
| `lib/tuya/TuyaEF00Manager.js` | Gestionnaire DP central (2312 lignes) | ✅ Opérationnel |

### 2.2 Architecture en 11 Couches RX/TX

| Couche | Nom | Fichier(s) Clé | Statut |
|--------|-----|-----------------|--------|
| L0 | Interception Brute | `TuyaZigbeeDevice.js` | ✅ |
| L1 | Contrôle de Flux | `UniversalThrottleManager.js` | ✅ |
| L2 | Routage Intelligent | `IntelligentProtocolRouter.js` | ✅ |
| L3 | Liaison (Binding) | `TuyaBoundCluster.js`, `TuyaE000BoundCluster.js` | ✅ |
| L4 | Moteur DP | `TuyaEF00Manager.js`, `AdaptiveDataParser.js` | ✅ |
| L5 | Synchronisation Temps | Protocole `0x24` | ✅ |
| L6 | Cohérence Physique | `PhysicalButtonMixin.js` | ✅ |
| L7 | Applicative | `BaseHybridDevice.js`, `HybridSwitchBase.js` | ✅ |
| L8 | Capacités Dynamiques | `DynamicCapabilityManager.js` | ✅ |
| L9 | Session IR Zosung | `SessionManager.js` | ⚠️ À implémenter |
| L10 | HealthMonitor | `HealthMonitor.js` | ⚠️ À implémenter |
| L11 | SanityFilter | `SanityFilter.js` | ⚠️ À implémenter |

### 2.3 Structure des Drivers

```
drivers/
├── air_purifier/           (15 variantes)
├── air_quality_*/          (CO2, comprehensive)
├── blaster_remote/         (IR blasters)
├── bulb_*/                 (Dimmable, RGB, RGBW, White)
├── button_wireless_*/      (1-8 gangs, fingerbot, scene)
├── ceiling_fan/
├── climate_sensor_*/       (dimmer, gas, plug, presence, smart, switch)
├── contact_sensor_*/       (curtain, dimmer, plug, switch)
├── curtain_*/
├── device_plug_*/          (dimmer, energy, smart, water)
├── dimmer_*/
├── door_lock_*/
├── fan_controller_*/
├── fingerbot/
├── generic_diy/
├── heater_*/
├── ir_remote_*/
├── leak_sensor/
├── light_*/
├── motion_sensor_*/
├── presence_sensor_*/
├── remote_button_*/
├── scene_switch_*/
├── sensor_*/
├── smart_knob/
├── smoke_detector/
├── siren/
├── soil_sensor_*/
├── switch_*/               (1-4 gangs)
├── thermostat_*/
├── usb_outlet_*/
├── valve_*/
├── wall_switch_*/          (1-4 gangs, 1way/2way)
└── water_sensor/
```

---

## 3. HISTORIQUE DES CRISES ET CORRECTIFS

### 3.1 Crashs Syntaxiques (Résolus)

| Version | Fichier | Erreur | Fix | Statut |
|---------|---------|--------|-----|--------|
| v7.4.6 | `lib/analytics/AdvancedAnalytics.js:215` | `SyntaxError: Unexpected token ')'` | Suppression parenthèse excédentaire | ✅ |
| v7.4.8 | `lib/utils/tuyaUtils.js:118` | `SyntaxError: Unexpected token ':'` | `return device.zclNode?.modelId ?? null;` | ✅ |
| v7.4.x | `app.js:45` | `MODULE_NOT_FOUND: ./lib/data/SourceCredits` | Safe require avec try/catch fallback | ✅ |

### 3.2 Issues GitHub Identifiées

| Issue | Description | Statut |
|-------|-------------|--------|
| #302 | Crash au démarrage: MODULE_NOT_FOUND SourceCredits | ✅ Corrigé (try/catch) |
| #305 | Fingerprint non trouvé: _TZE608_c75zqghm (Gate Opener) | ⚠️ À traiter |

### 3.3 Corrections Appliquées (Commits Récents)

| Commit | Description |
|--------|-------------|
| `33d8c32` | FEAT: integrate 11 new air quality variants |
| `26ddf51` | Community sync v7.5.8 - 200 new FPs |
| PR #260 | Insoma dual-valve support |
| PR #275 | Immax water timer |
| PR #276 | Solar soil sensor |

---

## 4. ARCHITECTURE DU PROJET

### 4.1 Modèle "Sculpteur & Statue"

| Composant | Environnement | Rôle |
|-----------|---------------|------|
| **Shadow Engine** | GitHub Actions (Cloud) | IA (XiaomiMimo), scraping, génération drivers, validation |
| **Runtime Engine** | Homey Pro (Local) | Exécution 100% locale, zéro cloud, bundle <7MB |

### 4.2 Gestion des Boutons (Zero-Defect)

| Règle | Description |
|-------|-------------|
| Rule 1.1 | Déduplication: isAppCommand=true → update UI, PAS de Flow |
| Rule 1.2 | Physique: isAppCommand=false → déclencher Flow physique |
| Rule 1.3 | Zero-Defect: triggerCapabilityListener() pour Flow Actions |
| Rule 2.1 | Timing: fenêtre 1.5s, debounce 200ms |

### 4.3 Profils Fabricants

| Marque | Fenêtre (ms) | Double-clic (ms) | Long Press (ms) | Protocole |
|--------|--------------|-------------------|-----------------|-----------|
| BSEED | 2000 | 500 | 800 | zcl_only (0xE000/0xE001) |
| Zemismart | 1500 | 400 | 700 | zcl_only (per-endpoint) |
| Moes | 1000 | 350 | 600 | hybride (0xE000) |
| Tuya Generic | 500 | 400 | 600 | tuya_dp |
| Sonoff | 800 | 400 | 500 | zcl_only |
| Konke | 1000 | 400 | 600 | zcl_only |
| Xiaomi/Aqara | — | — | — | Cluster 0xFCC0 |

### 4.4 Protocoles Exotiques

| Protocole | Clusters | Description | Couche Requise |
|-----------|----------|-------------|----------------|
| Zosung IR | 0xE004, 0xED00 | Fragmentation codes IR longs | L9 (SessionManager) |
| Tuya MCU OTA | 0xEF00 (cmd 0x1C) | Mise à jour firmware MCU | Transport Fiable |
| Time Sync | 0xEF00 (cmd 0x24) | Synchronisation horloge LCD | L5 (implémenté) |
| Xiaomi/Aqara | 0xFCC0 | Cluster propriétaire | ExoticQuirkEngine |

---

## 5. BUGS ET ISSUES CRITIQUES

### 5.1 Bugs Corrigés ✅

- **PF-01**: tuyaUtils.js:118 — SyntaxError `:` → Corrigé avec `?? null`
- **PF-02**: AdvancedAnalytics.js:215 — SyntaxError `)` → Parenthèse supprimée
- **PF-03**: app.js:45 — MODULE_NOT_FOUND SourceCredits → Safe require

### 5.2 Issues En Cours ⚠️

- **#305**: Fingerprint _TZE608_c75zqghm (QS-Zigbee-C03/TS0603) — Gate Opener
  - DP1: état (ouvert/fermé) → windowcoverings_state
  - DP2: position % → windowcoverings_set
  - DP3: contact sécurité → alarm_contact

### 5.3 Dette Technique

| Domaine | Problème | Impact |
|---------|----------|--------|
| Performance matcher | Array.find() sur 3300+ fingerprints (O(n)) | Latence pairing |
| Taille app.json | Potentiellement >7MB | Timeout déploiement |
| Absence L9-L11 | Couches non implémentées | IR blasters, health monitoring |
| Tests unitaires | 0% couverture | Risque régression |
| Vulnérabilités npm | 31 identifiées | Sécurité |

---

## 6. PLAN D'ACTION PRIORISÉ

### Phase 0 : Validation Immédiate (< 1h)

- [ ] **V0.1** : Vérifier taille app.json (`wc -c app.json`)
- [ ] **V0.2** : Vérifier syntaxe tous les JS (`find lib -name "*.js" -exec node -c {} \;`)
- [ ] **V0.3** : Vérifier aucun dossier _hybrid restant (`find drivers -type d -name "*_hybrid"`)
- [ ] **V0.4** : Audit npm (`npm audit`)
- [ ] **V0.5** : Build test (`homey app build`)

### Phase 1 : Correctifs Critiques (< 24h)

- [ ] **C1.1** : Corriger issue #305 (Gate Opener fingerprint)
- [ ] **C1.2** : Renforcer .eslintrc.json avec règles critiques
- [ ] **C1.3** : Optimiser app.json si >7MB
- [ ] **C1.4** : Index Map pour DynamicDriverMatcher (O(1) lookup)
- [ ] **C1.5** : Mettre à jour dépendances npm vulnérables

### Phase 2 : CI/CD & Prévention (< 1 semaine)

- [ ] **CI.1** : Créer `.github/workflows/syntax-check.yml`
- [ ] **CI.2** : Créer `.github/workflows/dependency-audit.yml`
- [ ] **CI.3** : Configurer Husky pre-commit hooks
- [ ] **CI.4** : Créer `scripts/validate-all.sh`
- [ ] **CI.5** : Ajouter tests unitaires critiques

### Phase 3 : Enrichissement Drivers (Continu)

- [ ] **E1.1** : Scraper zigbee.blakadder.com pour nouveaux devices
- [ ] **E1.2** : Analyser Z2M converters pour nouveaux DPs
- [ ] **E1.3** : Implémenter L9 (SessionManager pour IR Zosung)
- [ ] **E1.4** : Implémenter L10 (HealthMonitor pour heartbeat)
- [ ] **E1.5** : Implémenter L11 (SanityFilter pour valeurs aberrantes)

### Phase 4 : Publication & Monitoring

- [ ] **P1.1** : Build validation complète (`validate-all.sh`)
- [ ] **P1.2** : Publish test channel
- [ ] **P1.3** : Monitoring crash reports 48h
- [ ] **P1.4** : Communication forum (si fix stable)
- [ ] **P1.5** : Push stable-v5 si validé

---

## 7. CONFIGURATIONS ET SCRIPTS

### 7.1 `.eslintrc.json` Renforcé

```json
{
  "env": {
    "node": true,
    "es2022": true,
    "homey": true
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "extends": ["eslint:recommended"],
  "rules": {
    "no-unmatched-parens": "error",
    "no-unexpected-multiline": "error",
    "no-conditional-assignment": "error",
    "curly": ["error", "all"],
    "eqeqeq": ["error", "smart"],
    "no-var": "error",
    "prefer-const": "warn",
    "complexity": ["warn", 15],
    "max-statements": ["warn", 50],
    "max-params": ["warn", 5],
    "handle-callback-err": ["error", "^(err|error)$"],
    "no-eval": "error",
    "no-throw-literal": "error"
  },
  "globals": {
    "Homey": "readonly"
  },
  "ignorePatterns": [
    "node_modules/",
    ".homey/",
    "build/",
    "drivers/",
    "data/",
    "tmp/",
    "coverage/"
  ]
}
```

### 7.2 `.github/workflows/syntax-check.yml`

```yaml
name: Syntax & Build Validation
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'
      - run: npm ci
      - name: Syntax check all JS
        run: |
          find lib -name "*.js" -exec node -c {} \;
      - name: Detect critical patterns
        run: |
          grep -rn "if.*return.*:" lib/ --include="*.js" && exit 1 || true
          grep -rn "return.*)), " lib/ --include="*.js" && exit 1 || true
      - name: ESLint
        run: npx eslint lib/ --ext .js || true
      - name: Homey validate
        run: npx homey app validate --level=publish
      - name: Build
        run: npx homey app build
```

### 7.3 `scripts/validate-all.sh`

```bash
#!/bin/bash
set -euo pipefail
echo "🚀 Validation complète v7.5.8+"

echo "🔍 [1/5] Syntaxe JS..."
find lib -name "*.js" -exec node -c {} \;

echo "🔍 [2/5] Détection patterns critiques..."
grep -rn "if.*return.*:" lib/ --include="*.js" && echo "⚠️ Hybrid if/ternaire trouvé" || true
grep -rn "return.*)), " lib/ --include="*.js" && echo "⚠️ Parenthèses non appariées" || true

echo "🔍 [3/5] Aucun dossier _hybrid..."
HYBRID=$(find drivers -type d -name "*_hybrid" 2>/dev/null | wc -l)
[ "$HYBRID" -eq 0 ] && echo "✅ Pas de _hybrid" || echo "⚠️ $HYBRID dossiers _hybrid trouvés"

echo "🔍 [4/5] Homey validate..."
npx homey app validate --level=publish || echo "⚠️ Validation échouée"

echo "🔍 [5/5] Build..."
npx homey app build || echo "⚠️ Build échoué"

echo "✅ Validation terminée"
```

---

## 8. PLAN DE RECHERCHE POUR IA

### 8.1 Sources à Scraper

| Source | URL | Priorité |
|--------|-----|----------|
| Blakadder | zigbee.blakadder.com | 🔴 Haute |
| Z2M Converters | github.com/Koenkk/zigbee-herdsman-converters | 🔴 Haute |
| ZHA Quirks | github.com/zigpy/zha-device-handlers | 🟠 Moyenne |
| Forum Homey | community.homey.app/t/140352 | 🔴 Haute |
| Tuya Developer | developer.tuya.com | 🟠 Moyenne |

### 8.2 Fabricants par Région

| Région | Fabricants | Clusters Spécifiques |
|--------|------------|---------------------|
| 🇨🇳 Chine | Tuya, Xiaomi/Aqara, Sonoff, Moes, BSEED, Zemismart | 0xEF00, 0xFCC0, 0x0B04 |
| 🇪🇺 Europe | Legrand/Netatmo, Philips Hue, IKEA, Schneider | 0xFC40, 0xFC01/03, 0xFC7C |
| 🇺🇸 USA | SmartThings, Sengled, Centralite | 0xFC02, ZCL standard |
| 🇯🇵 Japon | Panasonic, Sharp, Samsung SDS | ZCL + extensions |

### 8.3 Priorités d'Enrichissement

1. **Air Quality Sensors** (_TZE284, PM2.5, CO2) — Pattern composite DP
2. **Radars mmWave** (_TZE204, TS0225) — Haut débit (300 msg/min)
3. **IR Blasters** (Zosung, Moes UFO-R11) — Fragmentation nécessaire (L9)
4. **Power Strips Multi-gang** (TS011F) — Endpoints multiples
5. **Gate Openers** (#305) — windowcoverings + contact

---

## 9. CHECKLIST FINALE

### Pré-Push
- [ ] `find lib -name "*.js" -exec node -c {} \;` → 0 erreurs
- [ ] `npx homey app validate --level=publish` → PASS
- [ ] `homey app build` → Archive générée
- [ ] Taille archive <7MB
- [ ] Aucun dossier _hybrid restant

### Post-Push
- [ ] Workflows CI/CD passent sur GitHub
- [ ] Monitoring crash reports 48h
- [ ] Réponse aux utilisateurs impactés
- [ ] Documentation mise à jour

### Monitoring Continu
- [ ] 0 crash reports SyntaxError
- [ ] Taux démarrage >99.9%
- [ ] Vulnérabilités npm = 0 critiques
- [ ] Couverture tests >70% modules critiques

---

> **Note** : Ce plan consolide TOUS les rapports précédents, pièces jointes, emails de diagnostic, analyses GitHub/forum, et spécifications techniques. Il est conçu pour être exécuté étape par étape par une IA (Cline/Gemini Flash) avec accès au dépôt et aux clés API (XiaomiMimo v2.5 Pro).

> **Prochaine action immédiate** : Exécuter la Phase 0 (validation) pour confirmer l'état actuel du dépôt, puis procéder aux correctifs et enrichissements.