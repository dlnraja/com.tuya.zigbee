# Utils - Sanitization & Helpers

## 📁 Contenu

### `sanitize.js` - Sanitization JavaScript

Fonctions pour nettoyer texte avec caractères spéciaux.

**Usage:**
```javascript
const {
    sanitizeHomeyChangelog,
    sanitizeGitCommit,
    sanitizeCLIArg
} = require('./utils/sanitize');

// Changelog Homey
const changelog = sanitizeHomeyChangelog('- feat: test\n- fix: bug');
// Résultat: "feat: test; fix: bug"

// Commit Git
const commit = sanitizeGitCommit('feat: "test" avec $vars');
// Résultat: "feat: 'test' avec vars"

// Argument CLI
const arg = sanitizeCLIArg('--option "value"');
// Résultat: "option value"
```

**Fonctions disponibles:**
- `sanitizeGitHubOutput(input)` - Pour outputs GitHub Actions
- `sanitizeHomeyChangelog(input, maxLength=500)` - Pour changelog Homey
- `sanitizeGitCommit(input)` - Pour messages Git
- `sanitizeFilename(input)` - Pour noms fichiers
- `sanitizeURL(input)` - Pour URLs
- `sanitizeJSON(input)` - Pour JSON
- `sanitizeLog(input)` - Pour logs (supprime ANSI)
- `sanitizeCLIArg(input)` - Pour arguments CLI
- `isSafeString(input)` - Vérifier si string est safe
- `sanitizeCommitList(commits, max=10)` - Pour liste commits
- `sanitizeStepSummary(input)` - Pour GitHub Step Summary

**Tests:**
```bash
node utils/sanitize.js
```

---

### `.github/scripts/sanitize.sh` - Sanitization Bash

Fonctions pour workflows GitHub Actions (Bash).

**Usage:**
```bash
# Source le script
source .github/scripts/sanitize.sh

# Sanitize changelog
SAFE_CHANGELOG=$(sanitize_homey_changelog "$RAW_CHANGELOG" 400)

# Sanitize commit message
SAFE_COMMIT=$(sanitize_git_commit "$RAW_MESSAGE")

# Vérifier sécurité
if is_safe_string "$INPUT"; then
    echo "✅ Safe"
fi
```

**Fonctions disponibles:**
- `sanitize_github_output` - Pour outputs GitHub
- `sanitize_homey_changelog` - Pour changelog Homey
- `sanitize_git_commit` - Pour commits Git
- `sanitize_filename` - Pour fichiers
- `sanitize_url` - Pour URLs
- `sanitize_json` - Pour JSON
- `sanitize_log` - Pour logs
- `sanitize_cli_arg` - Pour CLI
- `is_safe_string` - Vérifier sécurité

**Tests:**
```bash
bash .github/scripts/sanitize.sh
```

---

## 🎯 Cas d'Usage

### 1. Workflow GitHub Actions

```yaml
- name: Generate Changelog
  run: |
    source .github/scripts/sanitize.sh
    
    COMMITS=$(git log -5 --pretty=format:"%s")
    CHANGELOG=$(sanitize_homey_changelog "$COMMITS" 400)
    
    echo "changelog=$CHANGELOG" >> $GITHUB_OUTPUT
```

### 2. Script Node.js

```javascript
const { sanitizeHomeyChangelog } = require('./utils/sanitize');

const commits = await getCommits();
const changelog = sanitizeHomeyChangelog(commits.join('\n'));

await publishToHomey(changelog);
```

### 3. Scripts Batch Windows

Utiliser Node.js:
```batch
node -e "const {sanitizeFilename}=require('./utils/sanitize');console.log(sanitizeFilename('%FILE%'))"
```

---

## ⚠️ Pourquoi Sanitizer?

### Problèmes Sans Sanitization

**Erreur typique:**
```
homey app version minor "- feat: test\n- fix: bug"
Error: Unknown arguments: " ", f, e, a, t
```

**Cause:**
- Tirets initiaux interprétés comme options CLI
- Retours ligne cassent le parsing
- Guillemets non échappés
- Variables shell ($) interprétées

### Solution

```javascript
// ❌ AVANT (casse)
const changelog = '- feat: test\n- fix: bug';

// ✅ APRÈS (fonctionne)
const changelog = sanitizeHomeyChangelog('- feat: test\n- fix: bug');
// Résultat: "feat: test; fix: bug"
```

---

## 📚 Intégrations

### Workflows Utilisant Sanitization

- ✅ `.github/workflows/publish-auto.yml`
- ✅ `.github/workflows/manual-publish.yml` (prochainement)
- ✅ Tous nouveaux workflows

### Scripts Utilisant Sanitization

Recommandé pour:
- `scripts/MEGA_GITHUB_INTEGRATION_ENRICHER.js`
- `scripts/MEGA_FORUM_WEB_INTEGRATOR.js`
- Tout script générant des commits/changelog

---

## 🧪 Tests

### Test JavaScript
```bash
cd utils
node sanitize.js
```

### Test Bash
```bash
cd .github/scripts
bash sanitize.sh
```

### Test Intégration
```bash
# Tester dans workflow
git commit -m "test: sanitization"
git push
# Observer GitHub Actions
```

---

## 🔧 Maintenance

### Ajouter Nouvelle Fonction

**JavaScript:**
```javascript
function sanitizeNewType(input) {
    return String(input).replace(/pattern/g, '');
}

module.exports = {
    ...existing,
    sanitizeNewType
};
```

**Bash:**
```bash
sanitize_new_type() {
    local input="$1"
    echo "$input" | sed 's/pattern//g'
}

export -f sanitize_new_type
```

### Étendre Règles

Modifier les regex/patterns dans les fonctions existantes.

---

## 📖 Références

### Caractères Dangereux

| Caractère | Problème | Solution |
|-----------|----------|----------|
| `-` au début | Option CLI | Supprimer |
| `\n` | Multiligne | Remplacer par `;` |
| `"` `'` ` | Shell parsing | Supprimer/échapper |
| `$` | Variables shell | Supprimer |
| `\` | Échappement | Supprimer |
| `\x00-\x1F` | Contrôle | Supprimer |

### Limites Homey API

- **Changelog:** Max 500 caractères
- **Format:** Texte simple (pas markdown)
- **Ligne:** Une seule ligne
- **Encodage:** UTF-8 safe

---

## ✅ Checklist Utilisation

Avant d'ajouter texte utilisateur:

- [ ] Sanitizer avec fonction appropriée
- [ ] Vérifier longueur max
- [ ] Tester avec caractères spéciaux
- [ ] Vérifier dans workflow GitHub Actions
- [ ] Valider avec `is_safe_string()`

---

**Dernière mise à jour:** 2025-10-08  
**Auteur:** Système de sanitization universel
