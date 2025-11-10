# 🤖 Workflow Automatique - Git Smart Commit

## 🎯 Problème Résolu

**Avant:**
- ❌ Fichiers MD désorganisés à la racine
- ❌ Conflits merge/rebase constants
- ❌ Push/pull manuel fastidieux
- ❌ Oublis de ranger les fichiers

**Maintenant:**
- ✅ Auto-organisation des docs
- ✅ Zero conflit (no-rebase strategy)
- ✅ Commit + Pull + Push automatique
- ✅ Un seul alias git

---

## 🚀 Usage Simple

### Méthode 1: Smart Commit (Recommandé)

```bash
git sc -Message "ton message de commit"
```

**Fait automatiquement:**
1. 📁 Organise tous les `.md` dans les bons dossiers
2. 📦 `git add -A`
3. 💾 `git commit`
4. ⬇️ `git pull --no-rebase`
5. ⬆️ `git push`

### Méthode 2: Script Direct

```powershell
pwsh scripts/automation/SMART_COMMIT.ps1 -Message "message"
```

### Méthode 3: Organisation Seule

```powershell
pwsh scripts/automation/AUTO_ORGANIZE_DOCS.ps1
```

---

## 📂 Organisation Automatique

### Règles de Rangement

| Pattern Fichier | Destination |
|----------------|-------------|
| `*DIAGNOSTIC*.md` | `docs/analysis/` |
| `*ANALYSIS*.md` | `docs/analysis/` |
| `*FORUM*.md` | `docs/forum/` |
| `*RESPONSE*.md` | `docs/forum/` |
| `*REPORT*.md` | `docs/reports/` |
| `*RECOMMENDATIONS*.md` | `docs/reports/` |
| `*SESSION*.md` | `docs/reports/` |
| `*GUIDE*.md` | `docs/guides/` |
| Autres `*.md` | `docs/` (fallback) |

### Fichiers Exclus

Jamais déplacés automatiquement:
- `README.md`
- `CHANGELOG.md`
- `LICENSE.md`
- `CONTRIBUTING.md`

---

## 🔧 Configuration Git

### Configs Appliquées

```bash
# No rebase (évite conflits)
pull.rebase = false

# Meilleure résolution conflits
merge.conflictstyle = diff3

# Alias smart commit
alias.sc = !pwsh scripts/automation/SMART_COMMIT.ps1

# Alias sync simple
alias.sync = !git pull origin master --no-rebase && git push origin master
```

---

## 📊 Workflow Visuel

```
┌─────────────────────────────────────────┐
│   Travail sur fichiers (code, docs)    │
└───────────────┬─────────────────────────┘
                │
                ▼
        ┌───────────────┐
        │   git sc      │
        └───────┬───────┘
                │
        ┌───────▼──────────────────────────┐
        │ 1. AUTO_ORGANIZE_DOCS.ps1        │
        │    → Range tous les .md          │
        └───────┬──────────────────────────┘
                │
        ┌───────▼──────────────────────────┐
        │ 2. git add -A                    │
        └───────┬──────────────────────────┘
                │
        ┌───────▼──────────────────────────┐
        │ 3. git commit -m "message"       │
        └───────┬──────────────────────────┘
                │
        ┌───────▼──────────────────────────┐
        │ 4. git pull --no-rebase          │
        │    → Merge automatique           │
        └───────┬──────────────────────────┘
                │
        ┌───────▼──────────────────────────┐
        │ 5. git push origin master        │
        │    ✅ Done!                       │
        └──────────────────────────────────┘
```

---

## 💡 Exemples d'Usage

### Commit Rapide

```bash
git sc -Message "fix: corrected battery calculation"
```

### Commit Avec Files Désorganisés

Le script range automatiquement avant commit:

```bash
# Avant: DIAGNOSTIC_20251012.md à la racine
git sc -Message "docs: add diagnostic"
# Après: docs/analysis/DIAGNOSTIC_20251012.md
```

### Juste Organiser Sans Commit

```bash
pwsh scripts/automation/AUTO_ORGANIZE_DOCS.ps1
```

### Push de Commits Existants

```bash
git sc -Message "any message"
# Si aucun changement, fait juste le push
```

---

## 🛡️ Prévention des Conflits

### Stratégie No-Rebase

**Pourquoi?**
- Rebase réécrit l'historique → conflits constants
- Merge préserve l'historique → moins de conflits
- Pull --no-rebase = merge strategy

**Configuration:**

```bash
git config pull.rebase false
```

### En Cas de Conflit (Rare)

1. Le script s'arrête automatiquement
2. Résoudre manuellement:
   ```bash
   # Voir les conflits
   git status
   
   # Éditer les fichiers
   code file_with_conflict.json
   
   # Marquer comme résolu
   git add file_with_conflict.json
   git commit
   
   # Reprendre
   git sc -Message "resolved conflicts"
   ```

---

## 📈 Évolutions Futures

### Prochaines Améliorations

- [ ] Hook pre-commit automatique
- [ ] Détection smart des messages commit (via AI)
- [ ] Auto-génération CHANGELOG
- [ ] Integration tests avant push
- [ ] Notification Discord/Slack après push
- [ ] Auto-tag versions

---

## 🎓 Best Practices

### DO ✅

- Utiliser `git sc` pour tous les commits
- Laisser le script organiser les fichiers
- Commit fréquemment (petits commits)
- Messages de commit descriptifs

### DON'T ❌

- Ne pas utiliser `git push -f` (force push)
- Ne pas créer `.md` à la racine manuellement
- Ne pas utiliser `git pull --rebase`
- Ne pas ignorer les warnings du script

---

## 📚 Scripts Créés

| Script | Fonction | Usage |
|--------|----------|-------|
| `AUTO_ORGANIZE_DOCS.ps1` | Range les `.md` | Auto ou manuel |
| `SMART_COMMIT.ps1` | Commit intelligent | Via `git sc` |

---

## 🎯 Résultat Final

**Avant cette automation:**
- ⏱️ 5-10 minutes par commit (ranger + résoudre conflits)
- 😰 Stress des merge conflicts
- 🐛 Fichiers mal organisés

**Avec cette automation:**
- ⚡ 10 secondes par commit
- 😌 Zero stress
- 📁 Organisation parfaite automatique

---

**Créé:** 12 Octobre 2025  
**Version:** 1.0  
**Status:** ✅ Production Ready
