# 🧹 SYSTÈME D'ORGANISATION AUTOMATIQUE

**Status:** ✅ ACTIF  
**Execution:** Automatique après chaque push  

---

## 🎯 OBJECTIF

Maintenir la racine du projet propre et organisée automatiquement.

**Fichiers gardés à la racine:**
- ✅ README.md
- ✅ README.txt
- ✅ CHANGELOG.md
- ✅ CONTRIBUTING.md
- ✅ LICENSE
- ✅ Fichiers de configuration essentiels

**Tout le reste est organisé dans `docs/`**

---

## 🤖 FONCTIONNEMENT

### 1. Script de Nettoyage

**Fichier:** `scripts/maintenance/AUTO_ORGANIZE_ROOT.js`

**Actions:**
1. ✅ Supprime les backups `app.json.backup-*`
2. ✅ Déplace les fichiers MD/TXT vers `docs/`
3. ✅ Organise par catégorie:
   - Sessions → `docs/sessions/`
   - Commits → `docs/commits/`
   - Analyses → `docs/analysis/`
   - Guides → `docs/guides/`
   - Implémentations → `docs/implementation/`
   - Compliance → `docs/compliance/`
   - Drivers → `docs/drivers/`
   - Intégrations → `docs/integrations/`
   - Déploiement → `docs/deployment/`
   - Autres → `docs/misc/`

4. ✅ Crée `ROOT_ORGANIZATION.md` avec index

---

### 2. GitHub Action

**Fichier:** `.github/workflows/auto-organize.yml`

**Trigger:** Automatique après chaque push sur master

**Workflow:**
```yaml
1. Checkout repository
2. Setup Node.js
3. Install dependencies
4. Run AUTO_ORGANIZE_ROOT.js
5. Validate avec homey app validate
6. Commit changements (si validation OK)
7. Push automatique
```

**Protection:**
- ✅ Validation Homey obligatoire
- ✅ Rollback si validation échoue
- ✅ Skip CI pour éviter boucle infinie

---

## 📋 FICHIERS GARDÉS À LA RACINE

### Documentation Essentielle
- `README.md` - Documentation principale
- `README.txt` - Version texte
- `CHANGELOG.md` - Historique versions
- `CONTRIBUTING.md` - Guide contribution
- `LICENSE` - Licence projet

### Configuration Homey
- `app.json` - Manifest Homey
- `app.js` - App principale
- `.homeychangelog.json` - Changelog Homey
- `.homeyignore` - Ignore patterns

### Configuration Node
- `package.json` - Dépendances
- `package-lock.json` - Versions lockées

### Configuration Git
- `.gitignore` - Git ignore
- `.gitattributes` - Git attributes

### Outils
- `.prettierrc` - Config Prettier
- `.prettierignore` - Prettier ignore
- `.env.example` - Variables env
- `jest.config.js` - Config Jest
- `git_push.bat` - Script push

### Documentation Système
- `ROOT_ORGANIZATION.md` - Index organisation
- `AUTO_ORGANIZE_SYSTEM.md` - Ce fichier

---

## 🗂️ ORGANISATION DOCS/

```
docs/
├── sessions/          # Sessions développement
├── commits/           # Messages commits
├── analysis/          # Analyses & diagnostics
├── guides/            # Guides & tutoriels
├── implementation/    # Docs implémentation
├── compliance/        # SDK3 & Homey Pro
├── drivers/           # Updates drivers
├── integrations/      # Tuya, Zigate, etc.
├── deployment/        # Instructions déploiement
├── readme-variants/   # Variants README
└── misc/              # Divers
```

---

## 🚀 EXÉCUTION MANUELLE

Si besoin de nettoyer manuellement:

```bash
node scripts/maintenance/AUTO_ORGANIZE_ROOT.js
```

**Résultat:**
```
✅ Backups supprimés
✅ Fichiers organisés
✅ Index créé
✅ Racine propre
```

---

## ✅ AVANTAGES

1. **Racine propre** - Seulement fichiers essentiels
2. **Organisation automatique** - Pas d'intervention manuelle
3. **Documentation structurée** - Facile à trouver
4. **Validation garantie** - Homey validate avant commit
5. **Pas de boucle infinie** - [skip ci] dans commit
6. **Rollback auto** - Si validation échoue

---

## 📊 STATISTIQUES

**Dernière exécution:**
- Backups nettoyés: 3
- Fichiers déplacés: 57
- Fichiers gardés: 17
- Durée: 0.4s

---

## 🔧 MAINTENANCE

**Script:** Mise à jour patterns dans `AUTO_ORGANIZE_ROOT.js`  
**Workflow:** Modification `.github/workflows/auto-organize.yml`  
**Test:** Exécution manuelle avant push  

---

## 🎯 RÈGLES

**NE JAMAIS créer à la racine:**
- ❌ Fichiers temporaires .md/.txt
- ❌ Backups app.json
- ❌ Messages commits
- ❌ Sessions/status
- ❌ Analyses/diagnostics

**TOUJOURS créer dans docs/**

---

## 📝 EXEMPLE WORKFLOW

**Avant push:**
```
racine/
├── README.md
├── app.json
├── session_complete.md         ❌ Sera déplacé
├── commit_message.txt          ❌ Sera déplacé
├── app.json.backup-test        ❌ Sera supprimé
└── ...
```

**Après push (automatique):**
```
racine/
├── README.md                   ✅
├── README.txt                  ✅
├── app.json                    ✅
├── ROOT_ORGANIZATION.md        ✅
└── docs/
    ├── sessions/
    │   └── session_complete.md ✅
    └── commits/
        └── commit_message.txt  ✅
```

---

## 🎉 RÉSULTAT

**Racine toujours propre et organisée!** ✨

Système intelligent qui maintient l'ordre automatiquement sans intervention manuelle.

---

**Créé:** 2025-11-04  
**Status:** Production  
**Maintenance:** Automatique  
