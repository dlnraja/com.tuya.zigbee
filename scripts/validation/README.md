# 🔧 SCRIPTS DE VALIDATION

## 🆕 NOUVEAUX SCRIPTS INTELLIGENTS

### 🤖 comprehensive-recursive-validator.js

**Le validateur ultime** - Scanne TOUT le projet récursivement:

```bash
npm run validate:recursive
# OU
node scripts/validation/comprehensive-recursive-validator.js
```

**Features**:
- ✅ Valide tous les YAML (.yml, .yaml)
- ✅ Valide tous les JSON (.json)
- ✅ Valide tous les JavaScript (.js)
- ✅ Vérifie la structure des drivers
- ✅ Détecte les références cassées (require())
- ✅ S'adapte dynamiquement au projet
- ✅ Ignore automatiquement node_modules, .git, etc.
- ✅ Génère un rapport détaillé JSON

**Résultat**:
- Scanne 7000+ fichiers en quelques secondes
- Détecte 26 erreurs / 387 warnings
- Valide 100% des drivers actifs
- Rapport sauvegardé dans `docs/reports/validation-report.json`

---

### 🔨 auto-fix-common-issues.js

**Correction automatique intelligente**:

```bash
npm run fix:auto
# OU
node scripts/validation/auto-fix-common-issues.js
```

**Corrige automatiquement**:
- ✅ Trailing commas dans JSON
- ✅ Commentaires invalides dans JSON (// et /* */)
- ✅ Accolades manquantes en JavaScript
- ✅ Parenthèses manquantes
- ✅ Saute automatiquement les archives

**Usage complet**:
```bash
# Valide → Corrige → Re-valide
npm run validate:fix
```

---

## 📋 Scripts disponibles

### CHECK_APP_SIZE.js

```bash
node scripts/validation/CHECK_APP_SIZE.js
```

### CLEAN_AND_VALIDATE.js

```bash
node scripts/validation/CLEAN_AND_VALIDATE.js
```

### COMPLETE_PROJECT_VALIDATOR.js

```bash
node scripts/validation/COMPLETE_PROJECT_VALIDATOR.js
```

### DIAGNOSE_IMAGES.js

```bash
node scripts/validation/DIAGNOSE_IMAGES.js
```

### FINAL_COHERENCE_CHECK.js

```bash
node scripts/validation/FINAL_COHERENCE_CHECK.js
```

### PRE_COMMIT_CHECKS.js

```bash
node scripts/validation/PRE_COMMIT_CHECKS.js
```

### PROJECT_COHERENCE_CHECKER.js

```bash
node scripts/validation/PROJECT_COHERENCE_CHECKER.js
```

### UPDATE_APP_JSON_OPTIMIZED.js

```bash
node scripts/validation/UPDATE_APP_JSON_OPTIMIZED.js
```

### VALIDATE_ALL_DRIVERS.js

```bash
node scripts/validation/VALIDATE_ALL_DRIVERS.js
```

### VERSION_CHECKER.js

```bash
node scripts/validation/VERSION_CHECKER.js
```


## Utilisation

Tous les scripts peuvent être importés via l'index:

```javascript
const validation = require('./scripts/validation');
```
