# 🤖 SYSTÈME D'AUTOMATISATION COMPLÈTE

## Workflows Actifs

### 1️⃣ Auto Process GitHub Issues
**Fichier**: `workflows/auto-process-github-issues.yml`

**Déclenchement**:
- Automatique: Nouvelle issue avec label "New Device"
- Manuel: Actions → "Auto Process GitHub Issues" → Run workflow

**Actions**:
1. Extrait manufacturer + model de l'issue
2. Détecte type de device (smart plug, sensor, etc.)
3. Trouve driver Homey correspondant
4. Ajoute manufacturer ID automatiquement
5. Commit + push changements
6. Poste réponse complète sur issue
7. Ajoute labels appropriés

**Exemple**: Issue #1267 (HOBEIAN ZG-204ZL) → Driver enrichi en 30s

---

### 2️⃣ Auto Respond to PRs
**Fichier**: `workflows/auto-respond-to-prs.yml`

**Déclenchement**:
- Automatique: Nouveau Pull Request créé

**Actions**:
1. Analyse fichiers modifiés
2. Génère checklist contribution
3. Fournit guidelines spécifiques
4. Ajoute labels PR

**Résultat**: Contributeurs ont guidelines immédiatement

---

### 3️⃣ Scheduled Issues Scan
**Fichier**: `workflows/scheduled-issues-scan.yml`

**Déclenchement**:
- Automatique: Tous les jours 9h UTC
- Manuel: Actions → "Scheduled Issues Scan" → Run workflow

**Actions**:
1. Scan toutes issues ouvertes "New Device"
2. Filtre issues sans réponse automatique
3. Déclenche traitement pour chaque issue non traitée
4. Génère rapport quotidien

**Résultat**: Aucune issue device manquée

---

## 🚀 Quick Start

### Activation Workflows

```bash
# 1. Push workflows vers GitHub
git add .github/workflows/
git commit -m "Add automated workflows"
git push origin main

# 2. Vérifier permissions GitHub
# Settings → Actions → General → Workflow permissions
# ✅ Read and write permissions
# ✅ Allow GitHub Actions to create and approve pull requests
```

### Créer Labels Requis

Aller sur: `https://github.com/YOUR_REPO/labels`

**Labels à créer**:
- `New Device` (bleu #0075ca)
- `driver-enriched` (vert #0e8a16)
- `ready-for-testing` (vert clair #c5f015)
- `already-supported` (gris #d4c5f9)
- `needs-investigation` (orange #d93f0b)
- `contribution` (violet #a2eeef)

### Test Manuel

1. Aller sur Actions tab
2. Sélectionner workflow
3. Click "Run workflow"
4. Enter paramètres si demandés
5. Observer exécution

---

## 📊 Monitoring

### GitHub Actions

**Dashboard**: `https://github.com/YOUR_REPO/actions`

**Voir**:
- ✅ Workflows réussis
- ❌ Workflows échoués
- ⏱️ Temps exécution
- 📝 Logs détaillés

### Notifications

**Email automatique** si:
- ❌ Workflow échoue
- ⚠️ Rate limit atteint
- 🔒 Permission insuffisante

---

## 🔧 Troubleshooting

### Workflow ne démarre pas

**Vérifier**:
1. Label "New Device" présent sur issue
2. Permissions workflow activées
3. Workflows dans branch `main`

### Enrichissement échoue

**Causes possibles**:
1. Driver.compose.json malformé
2. Manufacturer déjà présent
3. Pas de structure zigbee

**Solution**: Voir logs GitHub Actions

### Rate Limiting

GitHub Actions: 1000 min/mois (free tier)

**Optimisation**:
- Scheduled scan: 1x/jour max
- Issues processing: On-demand only
- Délai 5s entre issues

---

## 📈 Statistiques Attendues

**Par mois**:
- ~60-150 issues device requests
- ~70% enrichies automatiquement
- ~20% déjà supportées
- ~10% investigation manuelle

**Économie temps**:
- Avant: 15-30 min/issue manuellement
- Après: 30s automatique
- **Gain**: ~20-40 heures/mois

---

## ✅ Best Practices

### Pour Issues

1. Utiliser template device request
2. Inclure manufacturer + model dans titre
3. Fournir device interview si possible
4. Tester réponse automatique

### Pour PRs

1. Modifier 1 driver à la fois (si possible)
2. Tester localement avant PR
3. Répondre à checklist automatique
4. Fournir résultats tests

### Pour Maintenance

1. Vérifier logs quotidiennement
2. Investiguer échecs workflows
3. Mettre à jour mappings si nécessaire
4. Monitorer rate limits

---

## 🔄 Évolution

### Améliorations Futures

1. **External DB Integration**:
   - Blakadder auto-fetch
   - Zigbee2MQTT sync
   - ZHA cross-reference

2. **AI Enhancement**:
   - Device interview parsing
   - Capability auto-detection
   - Driver recommendation ML

3. **Multi-repo**:
   - Monitor Johan Bendz repo
   - Cross-enrichment
   - Community collaboration

---

## 📞 Support

**Issues workflows**:
- Créer issue avec label "workflow"
- Inclure logs GitHub Actions
- Décrire comportement attendu vs réel

**Questions**:
- Discussions GitHub
- Documentation workflows

---

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Maintenance**: Automated  
**Cost**: $0 (GitHub Actions free tier)
