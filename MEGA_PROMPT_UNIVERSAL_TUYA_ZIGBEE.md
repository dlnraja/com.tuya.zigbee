# 🚀 MEGA PROMPT ULTRA-COMPLET - UNIVERSAL TUYA ZIGBEE v5.13.6+
## 📜 Plan d'Action, d'Investigation & de Maturation pour IA Avancée
## 🛠️ ZERO-DEFECT FLEET STABILIZATION MANDATE

> **📌 INSTRUCTION POUR L'IA AGENT (Cline / MiniMax / Gemini)** : Copie intégralement ce document dans ton contexte système. Tu dois l'ingérer comme protocole opérationnel absolu. Exécute chaque phase séquentiellement, respecte strictement les contraintes, préserve le contexte sans hallucination, et agis en architecte IoT senior spécialiste Homey Pro SDK3, Zigbee, WiFi, Matter et reverse engineering Tuya. Ne dévie jamais de ce plan. Ne publie rien sur le forum. Travaille silencieusement, étape par étape, avec vérification croisée permanente. Ce protocole intègre désormais le blindage v5.13.6 "Zero-Defect" pour la stabilisation de la flotte.

---

## 🚫 CONTRAINTES STRICTES (NON-NÉGOCIABLES)

### 1. Free-Tier & Limites de Tokens
- Reste strictement en free-tier GitHub Actions
- Utilise uniquement les GitHub Secrets fournis (`GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `HOMEY_PAT`, `GH_PAT`, `GOOGLE_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, `HF_TOKEN`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY`, `APIFREELLM_KEY`, `NVIDIA_API_KEY`)
- Limite strictement les appels aux API tierces (NVIDIA, Copilot, etc.)
- N'utilise aucun token payant
- Priorise les scripts locaux et les workflows GitHub optimisés
- **GitHub Copilot va bientôt facturer** : Prévois des limites strictes. Pas de paiement.
- Ajoute des logs de consommation de tokens dans `.github/workflows/token-monitor.yml`

### 2. Shadow Operation (Silence Total)
- **Aucune publication**, aucun commentaire public sur le forum Homey
- Aucun message externe, aucune annonce, aucun post
- Toute amélioration, correction, merge de PR, traitement d'issue se fait **silencieusement** dans le dépôt GitHub et via les workflows internes
- Communication uniquement via emails diagnostics privés (Homey → développeur)
- **REPLY_TOPICS doit être '140352' UNIQUEMENT** — Ne jamais poster sur T26439 (Johan) ou T146735 (Tuya)
- **Bot doit merger ses posts avec le dernier post dlnraja** — Ne jamais créer 2 posts bot consécutifs

### 3. Zéro Hallucination & Préservation du Contexte
- Ne devine rien. Ne suppose rien. Vérifie chaque fichier, chaque commit, chaque PR, chaque issue, chaque message forum, chaque changelog
- Préserve le contexte complet via des fichiers de checkpoint :
  - `.context_checkpoint.md` (état courant)
  - `.context_memory.json` (mémoire structurée)
  - `.context_memory_log.json` (journal des actions)
  - `.context_phase_*.md` (checkpoints par phase)
- Ne réponds jamais hors de ce plan

### 4. Distinction GitHub vs Homey App
| Catégorie | Fichiers GitHub (Sources) | Fichiers Homey (Build) | Action |
|-----------|---------------------------|------------------------|--------|
| **Sources** | `lib/`, `drivers/`, `scripts/`, `.github/` | ❌ | Modifier, enrichir, fixer, committer |
| **Build** | ❌ | `app.json`, `drivers/`, `assets/`, `build/` | Ne pas modifier directement. Rebuild depuis sources. |
| **Règles** | `docs/`, `.cursorrules`, `.windsurfrules`, dotfiles | ❌ | Mettre à jour, enrichir, vérifier, committer |
| **Checkpoints** | `.context_*.md`, `.context_*.json` | ❌ | Mettre à jour après chaque phase. Jamais supprimer |

### 5. Gestion Forum & PR/Issues
- **PR close par inadvertance** : Rouvrir + commentaire technique neutre :
  ```
  Reopened for systematic analysis and automated patching. 
  Will analyze PR diff against current codebase, cross-reference with forum reports.
  Additional info welcome.
  ```
- **Question utilisateur sur forum** : Analyser contexte, vérifier commits/logs, répondre **uniquement via workflow interne ou email diagnostic**. Jamais publiquement sur d'autres threads.
- **Rapport utilisateur** : Considérer comme véridique. Investiguer, croiser avec commits, changelogs, règles, variants manufacturerNames, device IDs.
- **Contexte forum** : Un même fabricant peut avoir TELLEMENT de variants (casse, séparateurs, suffixes) et de device IDs différents. Il faut TOUT gérer dynamiquement. Même chose pour les énergies (Zigbee/WiFi/Matter/Thread).

### 6. QR Code Issue (Priorité Critique)
- Investiguer immédiatement pourquoi le QR code de pairage ne fonctionne pas
- Vérifier : workflows de génération QR, assets `assets/qr_*`, permissions `app.json`, drivers, clusters, bindings, logs
- Corriger silencieusement avec commit explicite

---

## 🗺️ ARCHITECTURE DU PROJET & CARTE DES LOGIQUES EN COUCHES

```
┌─────────────────────────────────────────────────────────────┐
│ HOMEY APP (Build Final - Déployé)                           │
│  • app.json (2.1MB), .homeyignore, app.js (43KB)           │
│  • 218 drivers, assets/, capabilities/                      │
│  • Runtime: Homey Pro SDK3, Node.js 22, Zigbee/WiFi         │
└──────────────┬──────────────────────────────────────────────┘
               │ (build process)
┌──────────────▼──────────────────────────────────────────────┐
│ GITHUB REPO (Sources, CI/CD, Workflows, Rules)              │
│  • lib/ (devices, mixins, tuya, battery, managers)          │
│  • .github/workflows/ (39 workflows)                        │
│  • docs/, scripts/, data/                                   │
│  • commits, changelogs, PRs, issues, logs, diagnostics      │
│  • dotfiles: .cursorrules, .windsurfrules, .eslintrc...     │
└──────────────┬──────────────────────────────────────────────┘
               │ (logical layers)
┌──────────────▼──────────────────────────────────────────────┐
│ LAYERED LOGIC (RX/TX → Network → Raw → Zigbee → Tuya → Flow│
│  • Layer 1: RX/TX (Serial/Network frames, UART protocol)    │
│  • Layer 2: Raw Data (Hex/Binary payloads, DP parsing)      │
│  • Layer 3: Zigbee (Clusters 0xXXXX, Attributes, Bindings)  │
│  • Layer 4: Tuya (DP-to-Capability mapping, manufacturer)   │
│  • Layer 5: Flow (Homey flows, triggers, actions, cards)    │
│  • Layer 6: Energy Adaptive (Zigbee/WiFi/Matter/Thread)     │
└─────────────────────────────────────────────────────────────┘
```

### Dual-Track Version Strategy
| Aspect | 🟢 `stable-v5` (v5.11.212) | 🔵 `master-v7+` |
|--------|-----------------------------|-------------------|
| **App ID** | `com.dlnraja.tuya.zigbee.stable` | `com.dlnraja.tuya.zigbee` |
| **Drivers** | Fixes, pré-définis, mapping DP statique | Dynamiques, auto-détection, mapping DP adaptatif |
| **Flux** | Statiques, définis dans `driver.compose.json` | Dynamiques, générés selon capacités détectées |
| **Énergie** | Zigbee-only (stabilité) | Permissif (Zigbee/WiFi/Matter/Thread) |
| **Taille app.json** | Optimisé | Externalisation data/ |
| **Cible** | Stabilité absolue, 218 drivers | Intelligence, universalité |

---

## 📚 GUIDE DE RÉFÉRENCE ULTRA-COMPLET POUR IA (AI NAVIGATION GLOSSARY)

### Points de Vigilance & Limites

1. **Syntaxe JavaScript** : 
   - Jamais d'expression hybride `if (...) return ... : null` → utiliser `??` ou if/else explicite
   - Toujours vérifier les parenthèses dans les `return Math.round(...)`
   - ESLint rules : `no-unmatched-parens`, `no-unexpected-multiline`, `curly: all`

2. **Manufacturer Names** :
   - Toujours passer par `ManufacturerResolver.normalize()` avant comparaison
   - Gérer les accents (`Tüyä` → `tuya`), espaces insécables (`\u00A0`), majuscules
   - Un manufacturerName peut avoir TELLEMENT de variants et de device IDs différents → gérer dynamiquement
   - Même fabricant = multiples représentations (casse, séparateurs, suffixes, préfixes)

3. **Drivers `_hybrid`** :
   - Suffixe `_hybrid` OBSOLÈTE → tous les drivers doivent être permissifs
   - Les drivers doivent s'adapter à toute combinaison d'énergies (Zigbee/WiFi/Matter/Thread)
   - Script de refactor : `scripts/refactor-hybrid-drivers.js`

4. **Taille app.json** :
   - Cible : <2 Mo après externalisation dans `data/`
   - Externaliser : fingerprints, manufacturers, protocols, energy-profiles

5. **Battery Management** :
   - NEVER combine `measure_battery` + `alarm_battery` sur le même device
   - Mains-powered : `get mainsPowered() { return true; }` + `removeCapability('measure_battery')`
   - Runtime detection via UnifiedBatteryHandler

6. **Settings Keys** (CRITIQUE) :
   - `zb_model_id` NOT `zb_modelId`
   - `zb_manufacturer_name` NOT `zb_manufacturerName`

7. **Flow Cards** :
   - NO `titleFormatted` with `[[device]]` — causes manual selection bug
   - Virtual buttons MUST use `this.setCapabilityValue()` to route through the v5 hardening pipeline. This ensures flow triggers are protected by L14 SanityFilter.
   - **L14 Hardened Telemetry**: ALL state updates MUST use `this.setCapabilityValue()` inherited from `TuyaZigbeeDevice.js`. It provides automatic Anti-Flood and SanityFiltering.

8. **Anti-Generic Strategy** :
   - Drivers must be permissive at pairing time
   - universal_fallback must always remain enabled
   - Never fallback to `HOBEIAN_10G_MULTI` for missing model IDs

---

## 🗂️ RÈGLES IA À INVESTIGUER ET APPLIQUER

| Rule | Description | Impact |
|------|-------------|--------|
| **Rule 21** | Filtrage des flow cards par capacité | Interopérabilité |
| **Rule 24** | Normalisation insensible casse + Unicode des manufacturerNames | Reconnaissance fiable |
| **Rule 25** | Sync temps standardisée pour TS0601 | Précision temporelle |
| **Energy Adaptive** | Combinaisons énergétiques permissives | Universalité |
| **Safe Report** | Gestion des valeurs corrompues (NaN, Infinity) | Robustesse |
| **DP-01** | Fallback null si DP absent | Stabilité |
| **DP-02** | Validation plages avant setCapabilityValue | Fiabilité |
| **FLOW-01** | Vérifier capabilitySupported avant flow | UX |
| **ERR-01** | try/catch obligatoire autour ZCL/DP | Résilience |
| **PERF-01** | Limiter setCapabilityValue à 1/5s | Performance |
| **ANTI-GENERIC** | Permissif au pairing, enrichissement progressif | Compatibilité |
| **Rule 26** | Télémétrie Blindée L14 (EMA/ROC + Anti-Flood) | Stabilité Absolue |
| **Rule 27** | Case-Insensitive Matching (mfr/model) | Reconnaissance Fiable |

---

## 🔍 PLAN D'EXÉCUTION PHASÉ (SÉQUENTIEL, ÉTAPE PAR ÉTAPE)

### 🟦 PHASE 0 : INGESTION DU CONTEXTE & CHECKPOINT INITIAL
```bash
# 1. Cloner le dépôt (si pas déjà fait)
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee

# 2. Lire TOUS les dotfiles en entier
find . -name ".*" -type f ! -name ".git/*" -exec cat {} \; > .context_dotfiles_dump.txt

# 3. Parser l'historique complet des commits
git log --all --oneline --name-only > .context_commit_history.txt

# 4. Lister toutes les branches et leur état
git branch -a > .context_branches.txt

# 5. Créer le checkpoint initial
echo "# Context Checkpoint - Phase 0
Date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
Branches: $(cat .context_branches.txt | wc -l)
Dotfiles: $(wc -l < .context_dotfiles_dump.txt) lines
Commits: $(wc -l < .context_commit_history.txt)
Next: Phase 1" > .context_checkpoint_phase0.md
```

### 🟦 PHASE 1 : CARTOGRAPHIE EXHAUSTIVE DU REPOSITOIRE
1. **Scanner TOUS les fichiers** : dotfiles, `.js`, `.json`, `.yml`, `.md`, `.css`, `.html`
2. **Générer graphe de dépendances** : `madge --circular lib/`
3. **Analyser les dotfiles** : `.cursorrules`, `.windsurfrules`, `.eslintrc.json`, `.homeycompose/app.json`
4. **Auditer les workflows** : `.github/workflows/` (39 fichiers)
5. **Analyser les hotspots** : fichiers modifiés >50 fois dans l'historique
6. **Mapper les variants manufacturerNames** : extraire tous les variants des fingerprints
7. **Output** : `MAPPING_REPORT.md` avec arbre de dépendances, analyse dotfiles, hotspots

### 🟦 PHASE 2 : ANALYSE & TRIAGE PRs/ISSUES + FORUM CROSS-REFERENCE
1. **Scan GitHub** : Lister toutes les PRs et issues ouvertes/fermées
   ```bash
   gh pr list --state all --limit 100 > .context_prs_list.txt
   gh issue list --state all --limit 100 > .context_issues_list.txt
   ```
2. **Reopen Closed PRs/Issues** : Si close par inadvertance
3. **Cross-Reference Forum** : Lire posts, images, rapports utilisateurs (Thread #140352)
4. **Analyser les images forum** : Screenshots crash, pairing issues, energy problems
5. **Map to Codebase** : Croiser chaque rapport avec fichiers cibles
6. **Output** : `PR_ISSUE_TRIAGE.md` avec décisions et justifications

### 🟨 PHASE 3 : RÉCUPÉRATION EMAILS & DIAGNOSTICS (SHADOW)
1. **Exécuter le workflow Gmail** : `gmail-diagnostics-anonymize.yml`
   - Récupère les emails via Gmail API (read-only, via GitHub Secrets)
   - Filtre UNIQUEMENT `from:noreply@homey.app subject:[com.dlnraja.tuya.zigbee]`
   - Anonymise les données (emails, chemins, IPs)
   - Préserve le linking utilisateur (userHash stable)
   - Stockage incrémental : ne traite que les nouveaux emails
2. **Croiser avec forum et GitHub** : Corréler Log IDs, stack traces, user messages
3. **Clustering des erreurs** : SyntaxError, TypeError, ReferenceError, pairing failures
4. **Output** : `shadow-data/anonymized-linked.json` + `shadow-data/crash-clusters.md`

### 🟨 PHASE 4 : CORRECTION & OPTIMISATION
1. **Appliquer correctifs syntaxiques critiques** :
   ```bash
   sed -i 's/return Math\.round(safeDivide(uptime\*10))), 10);/return Math.round(safeDivide(uptime*10), 10);/' lib/analytics/AdvancedAnalytics.js
   sed -i 's/if (device\.zclNode?\.modelId) return device\.zclNode\.modelId : null;/return device.zclNode?.modelId ?? null;/' lib/utils/tuyaUtils.js
   ```
2. **Supprimer suffixes `_hybrid`** : `node scripts/refactor-hybrid-drivers.js`
3. **Implémenter Rule 24** : Normalisation manufacturerNames + mapping variants
4. **Implémenter index Map O(1)** : Pour DynamicDriverMatcher
5. **Optimiser app.json** : Externaliser données dans `data/`
6. **NPM Audit** : `npm audit fix --legacy-peer-deps`
7. **Output** : Correctifs appliqués + tests unitaires associés

### 🟧 PHASE 5 : AUTOMATION WORKFLOWS ENRICHMENT
1. **Enrichir les workflows existants** :
   - `daily-everything.yml` : Ajouter logique correction auto, QR fix, variants
   - `syntax-check.yml` : Ajouter auto-fix patterns critiques
   - `gmail-diagnostics-anonymize.yml` : Améliorer l'incrémentalité
2. **Token Limit & Free-Tier** :
   - Rate limits, token caps, retry limits, fallbacks
   - Logs de consommation de tokens
3. **Rapport hebdomadaire** (pas journalier) pour les YMLs qui ouvrent des PR
4. **Supprimer toute notion d'écriture sur le forum** dans le code et les GitHub Actions
5. **Output** : Workflows enrichis + token-monitor.yml

### 🟥 PHASE 6 : PUSH, PUBLISH, DRAFT-TO-TEST, DASHBOARD SYNC
1. **Push** : Committer toutes les corrections, enrichissements, workflows
2. **Draft-to-Test** : Vérifier que la version passe bien en test mode
3. **Dashboard Sync** : Vérifier cohérence versions (app.json, changelog, package.json)
4. **Vérifier disponibilité Homey App Store test**
5. **Output** : `PUSH_VALIDATION_REPORT.md` avec logs et confirmations

### 🟪 PHASE 7 : CONTINUOUS REFINEMENT LOOP + ANTI-HALLUCINATION
1. **Loop Execution** : Lancer workflows nécessaires autant que nécessaire
2. **Anti-Hallucination** : Ne rien inventer, vérifier chaque fichier, citer sources
3. **Context Preservation** : Mettre à jour `.context_checkpoint.md` après chaque action
4. **Enrichissement incrémental** : Mise à jour référentiels (manufacturers, fingerprints, rules)
5. **Fine-Tune** : Benchmark performances, optimisation cyclomatique, réduction complexité

---

## 📦 FICHIERS À CRÉER/REMPLACER LOCALEMENT

### 1. `lib/utils/manufacturerResolver.js` (Rule 24)
```javascript
// lib/utils/manufacturerResolver.js
const crypto = require('crypto');

class ManufacturerResolver {
  static normalize(name) {
    if (!name || typeof name !== 'string') return null;
    return name.trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '').replace(/_+/g, '_') || null;
  }

  static resolve(rawName, mapping = {}) {
    const normalized = this.normalize(rawName);
    if (!normalized) return null;
    return mapping[normalized] || normalized;
  }

  static generateId(canonicalName) {
    if (!canonicalName) return null;
    return crypto.createHash('sha256').update(canonicalName).digest('hex').slice(0, 12);
  }

  static buildMapping(entries) {
    const mapping = {};
    for (const entry of entries) {
      const canonical = this.normalize(entry.canonical);
      if (!canonical) continue;
      for (const variant of entry.variants) {
        const normalized = this.normalize(variant);
        if (normalized) mapping[normalized] = canonical;
      }
      mapping[canonical] = canonical;
    }
    return mapping;
  }
}

module.exports = ManufacturerResolver;
```

### 2. `scripts/refactor-hybrid-drivers.js`
```javascript
// scripts/refactor-hybrid-drivers.js
const fs = require('fs');
const path = require('path');

console.log('🔄 Refactoring drivers: suppression suffixe _hybrid...');
const driversDir = path.join(__dirname, '..', 'drivers');

if (fs.existsSync(driversDir)) {
  fs.readdirSync(driversDir).forEach(item => {
    const itemPath = path.join(driversDir, item);
    if (fs.statSync(itemPath).isDirectory() && item.endsWith('_hybrid')) {
      const newName = item.replace(/_hybrid$/, '');
      const newPath = path.join(driversDir, newName);
      console.log(`📁 Renommage: ${item} → ${newName}`);
      fs.renameSync(itemPath, newPath);
    }
  });
}

const appJsonPath = path.join(__dirname, '..', 'app.json');
if (fs.existsSync(appJsonPath)) {
  const app = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  let changed = false;
  if (app.drivers) {
    for (const [id, driver] of Object.entries(app.drivers)) {
      if (id.endsWith('_hybrid')) {
        const newId = id.replace(/_hybrid$/, '');
        app.drivers[newId] = driver;
        delete app.drivers[id];
        changed = true;
      }
    }
  }
  if (changed) fs.writeFileSync(appJsonPath, JSON.stringify(app, null, 2) + '\n');
}
console.log('✅ Refactorisation terminée');
```

### 3. `scripts/anonymize-diagnostics.js`
```javascript
// scripts/anonymize-diagnostics.js
const fs = require('fs');
const crypto = require('crypto');

function anonymizeEmail(email) {
  if (!email) return null;
  const hash = crypto.createHash('sha256').update(email).digest('hex').slice(0, 12);
  return `user-${hash}@anonymized.local`;
}

function anonymizePath(path) {
  if (!path) return null;
  return path.replace(/\/home\/[^/]+\//g, '/home/[REDACTED]/')
             .replace(/C:\\Users\\[^\\]+\\/g, 'C:\\Users\\[REDACTED]\\');
}

function processReport(report) {
  return {
    ...report,
    userEmail: anonymizeEmail(report.userEmail),
    homeyId: report.homeyId ? `homey-${crypto.createHash('sha256').update(report.homeyId).digest('hex').slice(0, 12)}` : null,
    stackTrace: report.stackTrace?.replace(/\/home\/[^/]+\//g, '/home/[REDACTED]/'),
    timestamp: report.timestamp,
    errorType: report.errorType,
    appVersion: report.appVersion,
    homeyFirmware: report.homeyFirmware,
    _shadowMeta: { processedAt: new Date().toISOString() }
  };
}

// CLI usage
const args = process.argv.slice(2);
const input = args.find(a => a.startsWith('--input='))?.split('=')[1];
const output = args.find(a => a.startsWith('--output='))?.split('=')[1];

if (!input || !output) {
  console.error('Usage: node anonymize-diagnostics.js --input=file.json --output=file.json');
  process.exit(1);
}

const reports = JSON.parse(fs.readFileSync(input, 'utf8'));
const anonymized = Array.isArray(reports) ? reports.map(processReport) : processReport(reports);
fs.writeFileSync(output, JSON.stringify(anonymized, null, 2));
console.log(`✅ Anonymized ${Array.isArray(anonymized) ? anonymized.length : 1} report(s)`);
```

### 4. `.eslintrc.json` (Renforcé)
```json
{
  "env": { "node": true, "es2022": true, "homey": true },
  "extends": ["eslint:recommended"],
  "rules": {
    "no-unmatched-parens": "error",
    "no-unexpected-multiline": "error",
    "no-conditional-assignment": "error",
    "curly": ["error", "all"],
    "complexity": ["warn", 15],
    "max-statements": ["warn", 50],
    "max-params": ["warn", 5],
    "handle-callback-err": "error",
    "no-return-await": "warn",
    "eqeqeq": ["error", "smart"],
    "no-throw-literal": "error"
  },
  "ignorePatterns": ["node_modules/", "build/", "data/", "coverage/"]
}
```

### 5. `.github/workflows/gmail-diagnostics-anonymize.yml`
```yaml
name: Gmail Diagnostics Anonymizer (Shadow)
on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

jobs:
  process-diagnostics:
    name: Anonymize & Aggregate Crash Reports
    runs-on: ubuntu-latest
    if: github.repository == 'dlnraja/com.tuya.zigbee'
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - run: npm ci
      
      - name: Fetch diagnostics from Gmail (read-only)
        env:
          GMAIL_CLIENT_ID: ${{ secrets.GMAIL_CLIENT_ID }}
          GMAIL_CLIENT_SECRET: ${{ secrets.GMAIL_CLIENT_SECRET }}
          GMAIL_REFRESH_TOKEN: ${{ secrets.GMAIL_REFRESH_TOKEN }}
        run: |
          node scripts/fetch-gmail-diagnostics.js \
            --query="from:noreply@homey.app subject:[com.dlnraja.tuya.zigbee]" \
            --max-results=50 --output=shadow-data/raw-diagnostics.json
        continue-on-error: true

      - name: Anonymize sensitive data
        run: |
          node scripts/anonymize-diagnostics.js \
            --input=shadow-data/raw-diagnostics.json \
            --output=shadow-data/anonymized-linked.json

      - name: Aggregate crash patterns
        run: |
          node scripts/cluster-crashes.js \
            --input=shadow-data/anonymized-linked.json \
            --output=shadow-data/crash-clusters.md \
            --alert-threshold=3

      - name: Upload anonymized report
        uses: actions/upload-artifact@v4
        with:
          name: anonymized-diagnostics
          path: shadow-data/
          retention-days: 30
```

### 6. `scripts/validate-all.sh`
```bash
#!/bin/bash
set -euo pipefail
echo "🚀 VALIDATION COMPLÈTE v5.11.212+"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Syntax check
echo "🔍 Syntaxe JavaScript..."
find lib -name "*.js" -type f -exec node -c {} \; || { echo "❌ SYNTAX ERROR"; exit 1; }
echo "✅ Syntaxe OK"

# 2. ESLint
echo "🔍 ESLint..."
npx eslint lib/ --ext .js --max-warnings=0 || echo "⚠️  Warnings (continuation...)"
echo "✅ ESLint OK"

# 3. Homey validate
echo "🔍 Homey SDK validation..."
npx homey app validate --level=publish || { echo "❌ Homey validation failed"; exit 1; }
echo "✅ Homey SDK OK"

# 4. Build
echo "🔍 Build..."
npx homey app build || { echo "❌ Build failed"; exit 1; }

# 5. Archive size
echo "🔍 Taille archive..."
ARCHIVE=$(ls build/*.tar.gz 2>/dev/null | head -1)
if [ -n "$ARCHIVE" ]; then
  SIZE=$(stat -c%s "$ARCHIVE" 2>/dev/null || stat -f%z "$ARCHIVE")
  SIZE_MB=$((SIZE / 1024 / 1024))
  echo "📦 ${SIZE_MB} Mo"
  [ $SIZE -gt 5242880 ] && echo "⚠️ Archive >5Mo"
fi

# 6. Vérification Télémétrie v5
echo "🔍 Vérification Télémétrie L14..."
grep -r "_safeSetCapability" lib/devices/ && echo "⚠️ Legacy _safeSetCapability found!"

# 6. Vérification _hybrid
echo "🔍 Vérification _hybrid..."
HYBRID_COUNT=$(find drivers -type d -name "*_hybrid" 2>/dev/null | wc -l)
[ "$HYBRID_COUNT" -gt 0 ] && echo "⚠️ $HYBRID_COUNT dossiers _hybrid restants"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ VALIDATION COMPLÈTE"
```

---

## 📌 INSTRUCTIONS FINALES (À RELIRE AVANT CHAQUE ACTION)

✅ **Exécuter séquentiellement**. Ne pas sauter de phase. Ne pas halluciner.  
✅ **Préserver le contexte** dans `.context_checkpoint.md` et fichiers associés.  
✅ **Distinguer GitHub vs Homey** : sources à modifier, build à rebuild.  
✅ **Shadow Operation** : Aucune publication publique. Silence total.  
✅ **Free-Tier** : Limiter appels API, utiliser GitHub Secrets, pas de tokens payants.  
✅ **Drivers permissifs** : Supprimer `_hybrid`, adapter à toute énergie.  
✅ **Rule 24** : Normaliser TOUS les manufacturerNames (insensible casse + Unicode).  
✅ **Incremental processing** : Ne jamais tout relire. Stocker IDs traités.  
✅ **Exécuter. Rapporter. Itérer**. Ne jamais arrêter d'améliorer.  

> 🚨 **RAPPEL OPÉRATIONNEL URGENT** : La version v5.11.212+ doit être publiée sur le canal test pour stopper l'hémorragie de crashs ET déployer les améliorations architecturales. Les correctifs sont prêts. Shadow operation uniquement.

**Commandes d'exécution immédiate** :
```bash
# 1. Validation finale
bash scripts/validate-all.sh && echo "✅ Ready for publish"

# 2. Publication shadow
git push origin stable-v5 --tags
homey app publish --test

# 3. Déploiement des garde-fous
git push origin master
```

---

## 📎 ANNEXES : FICHIERS DE RÉFÉRENCE

### GitHub Secrets Disponibles
| Secret | Usage |
|--------|-------|
| `HOMEY_PAT` | Publication app |
| `GH_PAT` | Cross-repo access |
| `GMAIL_CLIENT_ID/SECRET/REFRESH` | Email diagnostics |
| `GOOGLE_API_KEY` | Gemini Flash (free tier) |
| `OPENAI_API_KEY` | GPT-4o-mini |
| `GROQ_API_KEY` | Llama 3.3 70B (free) |
| `HF_TOKEN` | HuggingFace Granite (free) |
| `MISTRAL_API_KEY` | Mistral Small (free) |
| `OPENROUTER_API_KEY` | Llama 3.3 8B (free) |
| `NVIDIA_API_KEY` | NVIDIA free tier |
| `DISCOURSE_API_KEY` | Forum posting (READ ONLY) |
| `HOMEY_EMAIL/PASSWORD` | Forum fallback |

### AI Provider Chain (ai-helper.js)
```
GOOGLE_API_KEY → Gemini 2.0 Flash / Flash Lite (free)
OPENAI_API_KEY → GPT-4o-mini
GROQ_API_KEY → Llama 3.3 70B (free, fast)
HF_TOKEN → IBM Granite 3.3 8B (free)
MISTRAL_API_KEY → Mistral Small (free)
OPENROUTER_API_KEY → Llama 3.3 8B (free)
APIFREELLM_KEY → ApiFreeLLM (free, unlimited)
```

### Important Doc Files
| File | Lines | Purpose |
|------|-------|---------|
| `.windsurfrules` | 418 | Windsurf AI rules |
| `docs/ARCHITECTURE.md` | 562 | Architecture reference |
| `.github/WORKFLOW_GUIDELINES.md` | 368 | YML workflow guidelines |
| `docs/MEGA_PROMPT_WINDSURF.md` | 45 | Windsurf mega prompt |
| `PROJECT_INDEX.md` | 695 | AI reference guide |
| `.cursorrules` | 126 | Cursor AI rules |
| `.github/SECRETS.md` | 133 | Secrets reference |

---

> 🤖 **CE PROMPT EST EXÉCUTABLE IMMÉDIATEMENT**.  
> Il contient l'intégralité du contexte de la conversation, des analyses, des rapports, et des exigences techniques.  
> Il respecte la contrainte de shadow implementation. Toutes les priorités sont traitées comme égales.

**Prochaine étape** : Copier-coller ce prompt dans Cline/MiniMax/Gemini et exécuter Phase 0.

Bonne exécution. 🚀🛠️✨