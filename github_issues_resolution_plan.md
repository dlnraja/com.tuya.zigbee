# 📋 Plan de Résolution — GitHub Issues · com.dlnraja.tuya.zigbee

> **Version du projet** : v8.1.159+ | **365 drivers** | **3428 fingerprints** | **SDK v3**  
> **Date de création** : 2026-06-07  
> **Objectif** : Résoudre de manière systématique les GitHub Issues bloquants et les patterns récurrents

---

## 🔴 Problèmes Prioritaires Identifiés

> [!CAUTION]
> Ces problèmes causent des crash en production ou des appareils non reconnus par Homey.

| # | Catégorie | Symptôme | Impact |
|---|-----------|----------|--------|
| P1 | Fingerprint manquant | Appareil se paie comme "zigbee_generic" | CRITIQUE |
| P2 | Collision MFR+PID | Driver incorrect sélectionné | ÉLEVÉ |
| P3 | Battery conflict | `measure_battery` + `alarm_battery` ensemble | ÉLEVÉ |
| P4 | Workflow CI/CD | Push rejetés / boucles infinies | MOYEN |
| P5 | Flow Cards | `titleFormatted` + `[[device]]` invalides | MOYEN |
| P6 | DP mapping incorrect | Valeurs incorrectes (ex: 0.2°C au lieu de 20.6°C) | ÉLEVÉ |
| P7 | OOM au démarrage | Heap limit si `fingerprints.json` mal chargé | CRITIQUE |

---

## 📂 Catégories de Issues & Actions

### 1. 🔎 Fingerprint Manquant — Appareil non reconnu

**Symptôme** : L'utilisateur dit que son appareil est détecté comme générique ou pas du tout.

**Processus de résolution** :

```
1. Demander à l'utilisateur : manufacturerName + productId (depuis les logs Homey)
2. Vérifier dans driver-mapping-database.json si déjà mappé
3. Vérifier dans le driver.compose.json correspondant
4. Si absent → ajouter dans le bon driver
5. Si PID inconnu → créer nouveau driver ou enrichir universal_fallback
```

**Scripts disponibles** :
```bash
node .github/scripts/auto-learn-fingerprints.js
node scripts/validation/check-pairing-collisions.js
node .github/scripts/github-issue-manager.js
```

**Règle d'or** :
```
Fingerprint = manufacturerName + productId (COMBINED)
_TZ3000_abc + TS0001 → switch_1gang   ✅
_TZ3000_abc + TS0001 → switch_2gang   ❌ COLLISION (même MFR+PID dans 2 drivers différents)
```

**Fichiers à modifier** :
- `drivers/{type}/driver.compose.json` → ajouter dans `fingerprints[]`
- `driver-mapping-database.json` → sync automatique

---

### 2. ⚡ Collision MFR+PID

**Symptôme** : `check-pairing-collisions.js` détecte un vrai doublon.

> [!WARNING]
> Ne pas confondre avec les faux positifs : `audit-anti-generic.js` signale ~13 293 "collisions" qui sont des doublons **normaux dans le même driver** (TS0601, TS004x). Seuls les doublons **cross-drivers** sont des vrais problèmes.

**Processus** :
```
1. node scripts/validation/check-pairing-collisions.js  (0 = bon)
2. Si vrai conflit → identifier quel driver est correct pour le device
3. Supprimer le fingerprint du mauvais driver
4. Valider : npx homey app validate --level publish
```

**Règle de suppression** :
- SUPPRIMER si même `manufacturerName + productId` dans le **mauvais** driver
- NE PAS supprimer si même `manufacturerName` mais `productId` différent

---

### 3. 🔋 Problème Battery/Power

**Symptôme** : Appareil affiche batterie incorrecte, ou les deux indicateurs batterie à la fois.

> [!IMPORTANT]
> Règle SDK v3 absolue : JAMAIS `measure_battery` ET `alarm_battery` ensemble dans le même driver.

**Checklist de résolution** :
```javascript
// 1. Vérifier dans driver.compose.json :
const caps = compose.capabilities || [];
if (caps.includes('measure_battery') && caps.includes('alarm_battery')) {
  // → SUPPRIMER alarm_battery (garder measure_battery)
}

// 2. Pour les capteurs alimentés secteur :
get mainsPowered() { return true; }
// Dans onNodeInit :
await this.removeCapability('measure_battery').catch(() => {});
```

**Hiérarchie de détection battery** :
1. ZCL genPowerCfg (cluster 0x0001) → batteryPercentageRemaining ÷ 2
2. Tuya DP (DP 4, 10, 14, 15, 21, 100-105) → pourcentage direct
3. IAS Zone Status bit 3 → booléen low-battery
4. Voltage DPs (DP 33, 35, 247) → courbe tension→pourcentage
5. mainsPowered getter → supprimer toutes les capacités batterie

**Script de sécurité** :
```bash
node scripts/maintenance/revert-alarm-battery-conflict.js
```

---

### 4. ⚙️ Problèmes Workflow GitHub Actions (CI/CD)

**Symptômes fréquents** :
- Push rejeté (conflit concurrent)
- Boucle infinie d'automation
- Job qui crashe sur `require('./retry-helper')`
- Bot qui poste sur le mauvais fil du forum

**Solutions par symptôme** :

#### A. Push rejeté
```bash
# Toujours rebaser avant de pousser :
git pull --rebase origin master || true
git push || true
```

#### B. Boucle infinie workflow
```yaml
# Tout commit automatique DOIT avoir [skip ci] :
git commit -m "auto: description [skip ci]"
```

#### C. Job crash `require('./retry-helper')`
```yaml
# Chaque job doit avoir ces 3 étapes OBLIGATOIRES :
- uses: actions/checkout@v5
- uses: actions/setup-node@v5
  with:
    node-version: '22'
- run: npm ci --prefer-offline --no-audit || npm install
```

#### D. Bot poste sur mauvais fil
```yaml
# STRICT : seul T140352 autorisé pour les réponses
env:
  REPLY_TOPICS: "140352"
```

#### E. Workflow sans shell bash
```yaml
# OBLIGATOIRE dans tout workflow :
defaults:
  run:
    shell: bash
```

---

### 5. 🃏 Problèmes Flow Cards

**Symptôme** : Les flow cards ne se déclenchent pas, ou double déclenchement.

> [!WARNING]
> Ne JAMAIS utiliser `titleFormatted` avec `[[device]]` — cause un bug de sélection manuelle.

**Pattern correct** :
```javascript
// ID pattern :
{driver}_physical_gang{N}_{on|off}
// Exemple : switch_2gang_physical_gang1_on

// Déclencher correctement :
const isPhysical = reportingEvent && !this._appCommandPending;
if (isPhysical && previousState !== value) {
  this.homey.flow.getDeviceTriggerCard(flowId).trigger(this, {}, {});
}
```

**Déduplication (éviter double-trigger)** :
```javascript
const dedupKey = `${capability}_${value}`;
const now = Date.now();
if (this._lastFlowTrigger?.[dedupKey] && now - this._lastFlowTrigger[dedupKey] < 500) {
  return; // Skip duplicate
}
```

**Script d'audit** :
```bash
node .github/scripts/flow-card-audit.js
```

---

### 6. 📡 DP Mapping Incorrect (valeurs fausses)

**Symptôme** : Température à 0.2°C au lieu de 20.6°C (double-division bug).

**Root cause** : `AdaptiveDataParser` auto-divise déjà par 100, PUIS `dpMappings.divisor` divise à nouveau.

**Fix** :
```javascript
// TuyaEF00Manager doit sauter l'auto-convert si divisor !== 1 :
if (dpMapping && dpMapping.divisor && dpMapping.divisor !== 1) {
  // Skip auto-convert — le divisor custom gère la conversion
  value = rawValue; // pas de /100 automatique
}
```

**Référence** : Corrigé définitivement en v5.11.15.

---

### 7. 💾 OOM au démarrage (Issue #338)

**Symptôme** : `FATAL ERROR: Reached heap limit Allocation failed` au démarrage sur Homey Pro.

**Root cause** : `data/fingerprints.json` (11.5MB+) parsé via `JSON.parse(string)` crée une string UTF-16 massive en mémoire.

**Fix (v8.5.7+ implémenté)** :
```javascript
// ❌ ANCIEN (dangereux) :
const data = JSON.parse(fs.readFileSync(fpath, 'utf8'));

// ✅ CORRECT (économise 50% de heap) :
const buf = fs.readFileSync(fpath); // Buffer direct
const data = JSON.parse(buf);       // JSON parse Buffer directement

// Appeler GC défensif si disponible :
if (global.gc) global.gc();
```

> [!IMPORTANT]
> Vérifier que `data/fingerprints.json` n'est PAS ignoré dans `.homeyignore` — si ignoré → crash MODULE_NOT_FOUND au runtime!

---

## 🛠️ Outils & Scripts Disponibles

### Scripts de Validation
| Script | Rôle | Commande |
|--------|------|----------|
| `check-pairing-collisions.js` | Vrai 0 collision MFR+PID | `node scripts/validation/check-pairing-collisions.js` |
| `audit-anti-generic.js` | Anti-generic strategy | `node scripts/validation/audit-anti-generic.js` |
| `validate-drivers.js` | Validation complète drivers | `node .github/scripts/validate-drivers.js` |
| `flow-card-audit.js` | Audit flow cards | `node .github/scripts/flow-card-audit.js` |
| `fp-collision-check.js` | Collision fingerprints | `node .github/scripts/fp-collision-check.js` |

### Scripts de Maintenance
| Script | Rôle |
|--------|------|
| `auto-learn-fingerprints.js` | Apprendre nouveaux FPs de la communauté |
| `revert-alarm-battery-conflict.js` | Corriger les conflicts battery |
| `dedup-driver-fingerprints.js` | Déduplication des FPs dans les drivers |
| `fix-fp-conflicts.js` | Fix automatique des conflits FP |

### Scripts GitHub Issues
| Script | Rôle |
|--------|------|
| `github-issue-manager.js` | Manager complet issues/PR |
| `scan-prs-issues.js` | Scanner les issues ouvertes |
| `triage-run.js` | Triage automatique des issues |
| `auto-respond-intelligent.js` | Réponse automatique intelligente |
| `issue-deep-researcher.js` | Recherche profonde pour une issue |

### Validation Finale (Avant push)
```bash
npx homey app validate --level publish   # DOIT afficher SUCCESS
node scripts/validation/check-pairing-collisions.js   # DOIT afficher 0
node .github/scripts/validate-drivers.js   # DOIT passer
```

---

## 📋 Workflow de Résolution Étape par Étape

### Pour chaque Issue GitHub reçue :

```
ÉTAPE 1 — Triage
├── Lire la description complète de l'issue
├── Identifier la catégorie (fingerprint / bug / feature / battery / flow)
└── Chercher si déjà résolu dans CHANGELOG.md

ÉTAPE 2 — Investigation
├── Récupérer manufacturerName + productId depuis les logs Homey fournis
├── Chercher dans driver-mapping-database.json
├── Vérifier dans Z2M (Zigbee2MQTT) pour la définition DP
└── node .github/scripts/issue-deep-researcher.js

ÉTAPE 3 — Fix
├── Modifier driver.compose.json (fingerprint + capabilities)
├── Modifier device.js si DP mapping nécessaire
├── Valider JSON : node -e "JSON.parse(require('fs').readFileSync('drivers/X/driver.compose.json','utf8'))"
└── Valider JS : node -c drivers/X/device.js

ÉTAPE 4 — Tests
├── node scripts/validation/check-pairing-collisions.js
├── npx homey app validate --level publish
└── node .github/scripts/validate-drivers.js

ÉTAPE 5 — Commit & Push
├── git add -A
├── git commit -m "fix: [description] (#ISSUE_NUMBER)"
├── git pull --rebase origin master || true
└── git push

ÉTAPE 6 — Fermeture Issue
└── Commenter l'issue avec la version du fix et fermer
```

---

## 🚦 9-Layer Quality Gate — Check Obligatoire

Avant tout push, vérifier que ces 9 couches passent :

| Layer | Vérification | Commande |
|-------|-------------|---------|
| **L1** | Pas de `titleFormatted` + `[[device]]` | `node scripts/_verify_prs.js` |
| **L2** | `wall_switch_1gang_1way` hérite de SwitchBase | `node scripts/_verify_prs.js` |
| **L3** | `_TZ3000_ysdv91bk` enregistré | `node scripts/_verify_prs.js` |
| **L4** | `_TZ3000_blhvsaqf` enregistré | `node scripts/_verify_prs.js` |
| **L5** | wall touch dimmer driver existe | `node scripts/_verify_prs.js` |
| **L6** | Pas de suffix `_hybrid` ou `_hybride` | `node scripts/_verify_prs.js` |
| **L7** | Pas de `.toLowerCase()` manual sur mfr | `node scripts/_verify_prs.js` |
| **L8** | WiFi drivers héritent de `TuyaLocalDevice` | `node scripts/_verify_prs.js` |
| **L9** | Pas de `require('tuyapi')` direct | `node scripts/_verify_prs.js` |

---

## 🗂️ Issues Récentes Résolues (Référence)

| # | Titre | Version Fix | Méthode |
|---|-------|------------|---------|
| #2077 | presence_sensor_ceiling — pas de DP poll | v8.1.159 | Ajout periodic DP poll |
| #2076 | contact sensor — luminance pas reportée | v8.1.158 | Ajout DP poll pour luminance |
| #394 | rain sensor — pas de DP poll | v8.1.157 | Periodic poll |
| #388 | rain sensor `_TZ3210_tgvtvdoc` mauvais driver | v8.1.x | Déplacé → rain_sensor |
| #383 | bed sensor — TuyaEF00Manager pas initialisé | v8.1.x | Force TuyaEF00Manager init |
| #381 | radiator valve collision | v8.1.x | Fix cross-category collision |
| #379 | radiator valve collision | v8.1.x | Fix collision |
| #338 | OOM Heap Allocation au démarrage | v8.5.7 | Buffer parsing + lazy load |

---

## ⚠️ Règles Critiques à NE PAS Oublier

> [!CAUTION]
> Violations de ces règles = crash en production ou appareils mal jumelés.

1. **JAMAIS** `measure_battery` + `alarm_battery` dans le même driver
2. **JAMAIS** ignorer `data/fingerprints.json` dans `.homeyignore`
3. **JAMAIS** ajouter des bindings ZCL aux drivers Tuya DP (TS0601)
4. **JAMAIS** poster sur des fils forum autres que T140352
5. **JAMAIS** hardcoder des tokens dans les YML
6. **TOUJOURS** `[skip ci]` dans les commits automatiques
7. **TOUJOURS** `git pull --rebase` avant `git push`
8. **TOUJOURS** `defaults: run: shell: bash` dans les workflows YML
9. **TOUJOURS** `async onNodeInit()` (pas `onInit()` sync pour Zigbee)
10. **TOUJOURS** `await this.setCapabilityValue()` (avec await)

---

## 📌 Liens Rapides vers les Fichiers Clés

- [PROJECT_INDEX.md](file:///c:/Users/HP/Desktop/homey-app/tuya_repair/PROJECT_INDEX.md) — Master reference
- [WORKFLOW_GUIDELINES.md](file:///c:/Users/HP/Desktop/homey-app/tuya_repair/.github/WORKFLOW_GUIDELINES.md) — Règles YML/workflows
- [github-issue-manager.js](file:///c:/Users/HP/Desktop/homey-app/tuya_repair/.github/scripts/github-issue-manager.js) — Manager issues
- [driver-mapping-database.json](file:///c:/Users/HP/Desktop/homey-app/tuya_repair/driver-mapping-database.json) — DB fingerprints
- [nightly-processor.js](file:///c:/Users/HP/Desktop/homey-app/tuya_repair/.github/scripts/nightly-processor.js) — Pipeline nightly
- [CHANGELOG.md](file:///c:/Users/HP/Desktop/homey-app/tuya_repair/CHANGELOG.md) — Historique complet

---

## 🎯 Plan d'Action Immédiat

### Phase 1 — Diagnostic (Aujourd'hui)
- [ ] Lister toutes les issues ouvertes avec `node .github/scripts/scan-prs-issues.js`
- [ ] Identifier les issues avec fingerprint manquant
- [ ] Identifier les issues avec collision MFR+PID
- [ ] Grouper par catégorie

### Phase 2 — Fixes Rapides (Cette semaine)
- [ ] Corriger tous les fingerprints manquants signalés
- [ ] Résoudre les vrais conflits de collision
- [ ] Corriger les conflicts battery identifiés
- [ ] Valider avec le 9-layer gate

### Phase 3 — Prévention (Continue)
- [ ] S'assurer que les workflows `auto-respond.yml` répondent correctement
- [ ] Vérifier que `stale.yml` ferme automatiquement les issues obsolètes
- [ ] Activer `auto-reopen-on-comment.yml` avec les guards corrects
- [ ] Valider que `auto-close-supported.yml` fonctionne

### Phase 4 — Documentation
- [ ] Mettre à jour `PROJECT_INDEX.md` section Issues Résolues
- [ ] Ajouter à `CHANGELOG.md` les fixes
- [ ] Bumper la version dans `package.json`

---

*Plan créé le 2026-06-07 — À mettre à jour après chaque session de résolution*
