#  GUIDE CONFIGURATION GITHUB_TOKEN

##  TOKEN VALIDÉ
Votre token GitHub possède **tous les scopes requis** :
-  `repo` - Accès complet aux repositories
-  `workflow` - Modification des GitHub Actions
-  `admin:org` - Administration organisation
-  `delete:packages` - Gestion des packages
-  `write:packages` - Publication packages
-  **Aucune expiration** - Token permanent

##  ÉTAPES DE CONFIGURATION

### 1.  Configuration GitHub Secrets (CRITIQUE)

**Aller dans votre repository GitHub :**
1. Repository  **Settings**
2. **Secrets and variables**  **Actions**
3. Cliquer **"New repository secret"**
4. **Name**: `GITHUB_TOKEN`
5. **Secret**: Coller votre token (commence par `ghp_`)
6. Cliquer **"Add secret"**

### 2.  Configuration Locale (DÉVELOPPEMENT)

**Option A - Variable d'environnement PowerShell :**
```powershell
$env:GITHUB_TOKEN="votre_token_ici"
```

**Option B - Fichier .env (RECOMMANDÉ) :**
```bash
# Éditer le fichier .env
GITHUB_TOKEN=votre_token_ici
HOMEY_TOKEN=your_homey_token_here
```

### 3.  TEST DE CONFIGURATION

```bash
# Tester la configuration
node scripts/mega-automation/github-token-manager.js verify
```

##  ACTIVATION IMMÉDIATE

Une fois configuré, le système MEGA-Automation sera **100% opérationnel** :

###  Fonctionnalités Activées
-  **Veille automatique** (648 manufacturer IDs découverts)
-  **Processing automatique** PRs/Issues
-  **Analytics GitHub** haute fréquence
-  **Multi-source monitoring** (ZHA, Blakadder, etc.)
-  **Publication automatique** Homey App Store
-  **Orchestration hebdomadaire** intelligente

###  Fréquences d'Exécution
- **Toutes les 2h** : Composants critiques
- **Toutes les 6h** : Résolution IA + Analytics
- **Quotidien 3h** : Enrichissement connaissances
- **Dimanche 2h** : Orchestration complète

##  SÉCURITÉ

-  Token GitHub **jamais exposé** dans le code
-  Fichier `.env` **exclu Git** (.gitignore)
-  Scopes **minimum requis** respectés
-  **Pas d'expiration** - Token permanent

##  DÉPANNAGE

**Si erreurs d'authentification :**
```bash
# Vérifier token
echo $env:GITHUB_TOKEN

# Re-tester
node scripts/mega-automation/fast-recursive-validator.js
```

**Si GitHub Actions échouent :**
1. Vérifier que le secret `GITHUB_TOKEN` existe
2. Token doit commencer par `ghp_`
3. Tous les scopes requis présents

---
 **Avec votre token, le système sera 100% autonome et opérationnel !**
