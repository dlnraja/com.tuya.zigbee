# 📋 MAINTENANCE RULES — Universal Tuya Engine v7.x

> **Dernière mise à jour** : 2026-05-05  
> **Version** : 1.0.0  
> **Statut** : Appliqué automatiquement via CI/CD

---

## 🎯 OBJECTIF

Ce document définit les règles de maintenance pour garantir :
- Cohérence des fingerprints (manufacturerName + productId)
- Protection des tokens API (budgets stricts)
- Zéro facturation GitHub Copilot
- Séparation stricte GitHub vs Homey App

---

## 🔑 RÈGLE FONDAMENTALE : FINGERPRINTS = COMBINED

### La règle F1 (CRITIQUE)
```
Un appareil Zigbee est reconnu si et seulement si :
  manufacturerName + productId (modelId) correspondent SIMULTANÉMENT
```

```javascript
// ✅ VALIDE
fingerprint: [
  { manufacturerName: '_TZ3000_xyz', productId: 'TS0002' }
]

// ❌ INVALIDE (wildcard interdite)
fingerprint: [
  { manufacturerName: '_TZE284_*', productId: 'TS0601' }  // INTERDIT
]

// ❌ INVALIDE (productId manquant)
fingerprint: [
  { manufacturerName: '_TZ3000_xyz' }  // INCOMPLET
]
```

### Règles F2-F7 détaillées

| # | Règle | Description | Validateur |
|---|-------|-------------|------------|
| **F1** | Fingerprint COMBINED | manufacturerName + productId requis | `fingerprint-validator.js` |
| **F2** | MfrName multiple OK | Même manufacturerName dans plusieurs drivers = normal | `fp-collision-check.js` |
| **F3** | Pas de wildcards | `_TZE284_*` ou `_TZ3000_*` INTERDITS | `fingerprint-validator.js` |
| **F4** | Case-insensitive | Utiliser `CaseInsensitiveMatcher.js` | `misplaced-fp-detector.js` |
| **F5** | Pas de .toLowerCase() | Interdit dans les drivers | `enforce-rules.js` |
| **F6** | Settings keys exactes | `zb_model_id` (pas `zb_modelId`) | `check-invalid-paths.yml` |
| **F7** | Fallback endpoints | Si productId match mais mfrName non → tenter via endpoints | `DeviceFingerprintDB.js` |

---

## 🛡️ PROTECTION TOKENS API

### Budgets quotidiens (ai-helper.js)

| Provider | Cap/jour | Coût | Priorité |
|----------|----------|------|----------|
| NVIDIA NIM | 800 |Gratuit | ⭐⭐⭐ PRIMARY |
| HuggingFace | 500 |Gratuit | ⭐⭐ SECONDARY |
| Groq | 500 |Gratuit | ⭐⭐ SECONDARY |
| XiaomiMimo v2.5 Pro | 200 |Payant | ⭐ FALLBACK |
| Together.ai | 200 |Payant | ⭐ FALLBACK |
| Cerebras | 100 |Payant | ⭐ FALLBACK |
| DeepSeek | 50 |Payant | ⭐ LAST_RESORT |
| OpenRouter | Circuit breaker |Payant | ⭐ CIRCUIT_BREAKER |

### Protections activées

| Protection | Configuration | Statut |
|------------|---------------|--------|
| Circuit breaker | 3 erreurs → pause 5 min | ✅ |
| Backoff exponentiel | Retry 3x, max 60s | ✅ |
| Rate tracking | Fichier `.github/state/ai-rate-state.json` | ✅ |
| Cloudless-First | `PIPELINE_MODE=RULE_BASED` pour bypass IA | ✅ |
| Budget tracking | Logs par provider dans CI | ✅ |

---

## 🚫 GITHUB COPILOT — ZÉRO FACTURATION

### Règle C1 (CRITIQUE)
```
Aucun workflow GitHub Actions n'utilise GitHub Copilot.
Usage detected = automatique (devrait être 0).
```

### Vérification automatique
```yaml
# Syntaxe à ÉVITER dans tous les YMLs
- uses: github/copilot-infer@v1  # INTERDIT

# Syntaxe CORRECTE
- uses: actions/checkout@v4
- uses: nicolo-ribaudo/action-semantic-pull-request@v1
```

### Monitoring
- Script : `.github/scripts/copilot-analyzer.js`
- Fréquence : À chaque push/PR
- Alerte : Si usage détecté → workflow failure

---

## 📁 SÉPARATION GITHUB vs HOMEY APP

### Arborescence

```
tuya_repair/
├── .github/                    # GitHub Actions ONLY (exclu du bundle)
│   ├── workflows/              # 55 workflows CI/CD
│   ├── scripts/               # 100+ scripts automation
│   └── state/                 # Rate tracking, budgets
│
├── app/                       # Code exécuté dans Homey App
│   ├── app.js                 # SDK3 main entry
│   ├── lib/                   # Runtime libraries
│   ├── drivers/               # Device drivers
│   └── settings/              # Settings panel
│
├── docs/                      # Documentation
├── data/                      # Fingerprints, community intel
└── locales/                   # i18n
```

### Règles de séparation

| Vérification | Résultat attendu |
|--------------|------------------|
| `app.js` contient `process.env.GITHUB_*` ? | ❌ NON |
| `.github/scripts/` importé dans `app.js` ? | ❌ NON |
| `.homeyignore` exclut `.github/` ? | ✅ OUI |
| `.homeyignore` exclut `scripts/` (root) ? | ✅ OUI |

### Validation CI
```yaml
# validate.yml vérifie automatiquement :
- bundle size < 7 Mo
- Aucun fichier .github/ dans le bundle
- Aucune dépendance GitHub Actions runtime
```

---

## 🔧 SCRIPTS DE MAINTENANCE

| Script | Usage | Fréquence |
|--------|-------|-----------|
| `fingerprint-validator.js` | Valide F1-F7 à chaque PR | Push/PR |
| `fp-collision-check.js` | Détecte fingerprints en double | Hebdomadaire |
| `ai-rate-tracker.js` | Track consommation tokens | Quotidien |
| `copilot-analyzer.js` | Détecte usage Copilot | Push/PR |
| `enforce-rules.js` | Valide pattern .toLowerCase() | Push/PR |

---

## 📅 FRÉQUENCE WORKFLOWS (RÈGLES)

| Type | Fréquence max | Exemples |
|------|---------------|----------|
| **Quotidien** | INTERDIT | Aucune action ne doit tourner tous les jours |
| **Hebdomadaire** | ✅ OK | maintenance, enrich-drivers, promotion |
| **Bi-hebdomadaire** | ✅ OK | tuya-automation-hub (lun+jeu) |
| **Mensuel** | ✅ OK | community-sync, device-enrichment |
| **Sur événement** | ✅ OK | validate, syntax-check (push/PR) |
| **Manuel** | ✅ OK | diagnostic-anonymizer, triage |

---

## ✅ CHECKLIST PRÊTE À L'EMPLOI

### Avant chaque push/PR
- [ ] `fingerprint-validator.js` passe (F1-F7 respectées)
- [ ] Pas de wildcards dans manufacturerName
- [ ] Settings keys correctes (`zb_model_id`, `zb_manufacturer_name`)
- [ ] `copilot-analyzer.js` = 0 usage Copilot
- [ ] Tokens via `${{ secrets.* }}` uniquement

### Validation bundle
- [ ] `homey app validate --level publish` passe
- [ ] Bundle size < 7 Mo
- [ ] `.github/` exclu du bundle

---

## 📊 METRIQUES

| Métrique | Objectif | Actuel |
|----------|----------|--------|
| Workflows hebdo | 100% hebdo+ | ✅ 100% |
| Usage Copilot | 0 | ✅ 0 |
| Tokens via secrets | 100% | ✅ 100% |
| Fingerprint F1-F7 | 100% conformes | 🔄 En cours |
| Bundle size | < 7 Mo | ✅ < 7 Mo |

---

## 🔗 LIENS UTILES

- [GLOBAL_IMPROVEMENT_PLAN.md](../GLOBAL_IMPROVEMENT_PLAN.md)
- [ARCHITECTURAL_RULES.md](./ARCHITECTURAL_RULES.md)
- [ZIGBEE_TUYA_RULES.md](./ZIGBEE_TUYA_RULES.md)
- [ai-helper.js](../../.github/scripts/ai-helper.js)
- [fingerprint-validator.js](../../.github/scripts/fingerprint-validator.js)