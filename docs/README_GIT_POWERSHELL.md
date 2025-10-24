# 🔧 Git avec PowerShell - Solutions

## ❌ Problème PowerShell

Quand vous utilisez `git commit -m "message"` dans PowerShell, vous pouvez avoir cette erreur:

```
Invoke-Expression: A positional parameter cannot be found that accepts argument 'feat:'.
```

## ✅ Solutions

### Solution 1: Utiliser GIT_COMMIT_HELPER.bat

```cmd
GIT_COMMIT_HELPER.bat "votre message de commit"
```

### Solution 2: Utiliser le script Node.js

```bash
node scripts/SAFE_GIT_COMMIT.js "votre message"
```

### Solution 3: Échapper les guillemets PowerShell

```powershell
git commit -m 'votre message'  # Utiliser guillemets simples
```

### Solution 4: Utiliser cmd.exe

```powershell
cmd /c "git add -A && git commit -m \"message\" && git push origin master"
```

## 📝 Exemples

### Commit simple
```cmd
GIT_COMMIT_HELPER.bat "feat: Add new feature"
```

### Commit multi-lignes (via batch)
```bat
@echo off
git add -A
git commit -m "feat: Major update" -m "- Feature 1" -m "- Feature 2"
git push origin master
```

### Via Node.js
```bash
node scripts/SAFE_GIT_COMMIT.js "feat: Update" "Line 1" "Line 2"
```

## ✅ Commandes Qui Fonctionnent Toujours

```bash
# Status
git status

# Add
git add -A

# Push (si déjà committé)
git push origin master

# Pull
git pull origin master
```

## 🎯 Best Practice

Pour éviter les problèmes, créez toujours un fichier `.bat` temporaire:

```bat
@echo off
git add -A
git commit -m "your message here"
git push origin master
```

Puis exécutez: `.\temp.bat`

---

**Note:** Les outils `GIT_COMMIT_HELPER.bat` et `SAFE_GIT_COMMIT.js` ont été créés pour résoudre ce problème automatiquement.
