# Purge de l'historique git — Procédure

## Contexte

La sécurisation du projet a révélé que des fichiers sensibles et des données opérationnelles privées se trouvent encore dans **l'historique git** du dépôt, même s'ils ne sont plus trackés dans l'index actuel.

### Chiffres avant purge

- **7 863 private paths** dans l'historique git, dont :
  - 7 696 objets `.github/state/`
  - 123 dumps diagnostics JSON
  - 36 tarballs `.diag/`
  - 5 autres (cache, credentials, scripts agent locaux)
- **4 commits historiques** contiennent des patterns ressemblant à des secrets (valeurs redacted par le scanner).

### Résultat après purge

- **0 private path** dans l'historique git ✅
- **3 commits** avec des patterns de secrets restants, tous identifiés comme faux positifs :
  - `7b64ef71f142` — ajout de règles `.agents/` (match sur le nom de variable `tuyaSecretConfigured`)
  - `af7a1c0ee237` — fix de régressions (même nom de variable)
  - `e7bc87265f67` — *chore: sanitize secret examples* (modification de `.github/secrets.example` qui contient des placeholders)
- Le remote `origin` a été supprimé par `git-filter-repo` (comportement normal) ; il doit être ré-ajouté avant push.

### Pourquoi purger ?

`git rm --cached` retire les fichiers de l'index futur, mais ils restent accessibles dans tous les commits précédents. Pour une suppression définitive, il faut réécrire l'historique.

---

## Outil recommandé : `git-filter-repo`

`git-filter-repo` est l'outil moderne et rapide recommandé par GitHub pour purger l'historique (remplaçant de `git filter-branch` et du BFG).

### Prérequis

1. Sauvegarder le dépôt local (zip du répertoire `C:\Users\Dell\Documents\homey\master`).
2. Installer `git-filter-repo` :

   Si `python3` n'est pas disponible dans Git Bash, utiliser l'interpréteur Python fourni avec Codex :

   ```bash
   PYTHON="/c/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe"
   "$PYTHON" -m pip install git-filter-repo
   export PATH="/c/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/Scripts:$PATH"
   ```

   Ou avec un Python standard :

   ```bash
   python3 -m pip install --user git-filter-repo
   ```

3. S'assurer que toutes les branches locales sont à jour.

---

## Étapes

### 1. Aperçu (dry-run)

```bash
cd /c/Users/Dell/Documents/homey/master
node scripts/ci/purge-sensitive-history.js --dry-run
```

Ce script affiche la commande `git filter-repo` qui sera exécutée, sans rien modifier.

### 2. Exécution de la purge

```bash
node scripts/ci/purge-sensitive-history.js --execute
```

Cette opération :
- réécrit tous les commits contenant les chemins listés ;
- change les hashes de commits ;
- supprime les chemins sensibles de **toutes** les branches locales.

### 3. Vérification

```bash
node scripts/ci/history-secret-scanner.js
```

Le résultat doit indiquer `privatePathCount: 0` et `clean: true`.

### 4. Ré-ajouter l'origin (si nécessaire)

`git-filter-repo` supprime le remote `origin` par sécurité. Pour pousser vers GitHub, le ré-ajouter :

```bash
git remote add origin https://github.com/dlnraja/com.tuya.zigbee.git
```

### 5. Synchronisation avec l'origin

Après une purge d'historique, un push classique est rejeté. Utiliser :

```bash
git push --force-with-lease --all
git push --force-with-lease --tags
```

> ⚠️ Cette étape affecte tous les collaborateurs. Ils doivent recloner ou réinitialiser leur copie locale.

---

## Exécution réelle (2026-07-27)

La purge a été exécutée en 3 passes avec `git-filter-repo` :

1. **Passe 1** : suppression des fichiers d'état opérationnels spécifiques et backups.
   - Résultat : 7 863 → 7 705 private paths.
2. **Passe 2** : ajout du catch-all `.github/state/**`, `.cache/`, `diagnostics/` et keeps pour `.gitkeep`/`README.md`.
   - Résultat : 7 705 → 1 private path (`.agents/fix_wall_flow.js`).
3. **Passe 3** : ajout de `.agents/fix_*.js`.
   - Résultat : **0 private path**.

Commandes utilisées :

```bash
export PATH="/c/Users/Dell/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/Scripts:$PATH"
node scripts/ci/purge-sensitive-history.js --execute
```

Vérification :

```bash
node scripts/ci/history-secret-scanner.js
# privatePathCount: 0
```

Backup créé avant purge :

```
C:\Users\Dell\Documents\homey\backups\master-pre-history-purge-20260727-223503
```

---

## Risques

- **Hashes de commits modifiés** : toutes les références (branches, tags, PRs) basées sur l'ancienne histoire deviennent invalides.
- **Force-push obligatoire** : nécessite des droits d'administration sur le dépôt distant.
- **Collaborateurs** : doivent être prévenus pour éviter de réintroduire l'ancienne histoire.
- **CI/CD** : les pipelines basées sur des hashes de commits spécifiques peuvent échouer.

---

## Alternative si la purge n'est pas acceptable

Si réécrire l'historique n'est pas envisageable (dépôt public avec de nombreux forks, par exemple) :

1. Laisser les fichiers dans l'historique passé.
2. S'assurer qu'ils ne sont plus trackés dans les futurs commits (✅ déjà fait).
3. Si des credentials réels ont fuité, les **rotater** immédiatement.
4. Activer GitHub secret scanning sur le dépôt pour surveiller les futures fuites.

---

*Document créé lors de la sécurisation du 2026-07-27.*
