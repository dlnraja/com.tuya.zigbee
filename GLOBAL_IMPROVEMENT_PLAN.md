# 🌍 GLOBAL IMPROVEMENT PLAN — Universal Tuya Engine v7.x

> **Dernière mise à jour** : 2026-05-02  
> **Branche** : master (v7+) / stable-v5  
> **Statut** : En cours d'exécution

---

## ✅ PHASE 0 — CORRECTIONS CRITIQUES (TERMINÉ)

| Tâche | Statut | Issue |
|-------|--------|-------|
| Fix crash SourceCredits (safe require + fallback) | ✅ Done | #302 |
| Fix valve_irrigation driver corrompu | ✅ Done | #260 |
| Créer capabilities dim.valve_1..4 | ✅ Done | #260 |
| Validation `homey app validate --level publish` | ✅ PASSED | — |
| Push stable-v5 + master synchronisés | ✅ Done | — |

---

## ✅ PHASE 1 — SÉCURITÉ & LIMITES COÛTS (TERMINÉ)

### 1.1 Limites tokens API (ai-helper.js)
| Provider | Cap quotidien | Statut |
|----------|--------------|--------|
| NVIDIA NIM (free tier) | 800/jour | ✅ Intégré |
| XiaomiMimo v2.5 Pro | 200/jour | ✅ Intégré |
| HuggingFace | 500/jour | ✅ Intégré |
| Cerebras | 100/jour | ✅ Intégré |
| Together.ai | 200/jour | ✅ Intégré |
| Groq | 500/jour | ✅ Intégré |
| DeepSeek | 50/jour | ✅ Intégré |
| OpenRouter | Circuit breaker | ✅ Intégré |

### 1.2 Protections
- **Circuit breaker** : Désactive un provider pendant 3-5 min après erreur 429/5xx ✅
- **Backoff exponentiel** : Retry avec jitter (max 60s) ✅
- **Rate tracking persistant** : Fichier `.github/state/ai-rate-state.json` ✅
- **Cloudless-First Shield** : Mode `PIPELINE_MODE=RULE_BASED` pour bypass total IA ✅
- **Token budget tracking** : Logs de consommation par provider ✅

### 1.3 NVIDIA_API_KEY dans les YMLs
- Présent dans **28+ workflows** ✅
- Priorité FREE TIER dans la chaîne d'appels IA ✅

---

## ✅ PHASE 2 — FORUM & COMMUNICATION (TERMINÉ)

### 2.1 Suppression automatique forum
- `github-auto-manage.yml` : "FORUM POSTING REMOVED v7.4.15" ✅
- `master-cicd.yml` : "All forum updates must be done manually" ✅
- **Aucun code JS ne poste sur le forum** ✅
- **Aucun workflow YML ne poste sur le forum** ✅

### 2.2 Workflows lecture seule
Les workflows suivants **lisent** le forum pour enrichissement (sans écrire) :
- `monthly-community-sync.yml` — Sources: threads 140352, 26439, 146735, 89271
- `monthly-device-enrichment.yml` — Scraping URLs forum
- `monthly-enrichment.yml` — Analyse forums régionaux

---

## ✅ PHASE 3 — AUTOMATISATION CI/CD (TERMINÉ)

### 3.1 Fréquence des workflows
| Workflow | Fréquence | Action |
|----------|-----------|--------|
| `enrich-drivers.yml` | **Hebdomadaire** (lundi 3h UTC) | Scraping Blakadder + Z2M + ZHA |
| `daily-everything.yml` | **Hebdomadaire** (dimanche 2h UTC) | Scan complet |
| `daily-maintenance.yml` | **Hebdomadaire** (lundi 3h UTC) | Maintenance |
| `daily-promote-to-test.yml` | **Hebdomadaire** (lundi 3h45 UTC) | Promotion test |
| `nightly-auto-process.yml` | **Manuel uniquement** | Désactivé du schedule |
| `weekly-*` | Hebdomadaire | Divers |
| `monthly-*` | Mensuel | Enrichissement |

### 3.2 Validation CI
- `syntax-validation.yml` — Syntaxe JS à chaque PR ✅
- `validate.yml` — Validation SDK3 hebdomadaire ✅
- `code-quality.yml` — Qualité code hebdomadaire ✅
- `check-invalid-paths.yml` — Vérification chemins ✅

---

## 🔄 PHASE 4 — ENRICHISSEMENT MONDIAL (EN COURS)

### 4.1 Sources de scraping
| Source | URL | Statut |
|--------|-----|--------|
| Blakadder | zigbee.blakadder.com | ✅ Scripté |
| Zigbee2MQTT | github.com/Koenkk/zigbee2mqtt | ✅ Scripté |
| ZHA | github.com/zigpy/zha-device-handlers | ✅ Scripté |
| Forums régionaux | CN/JP/RU/FR/DE | 🔄 Enrichissement continu |

### 4.2 Nouveaux devices prioritaires
- Capteurs qualité d'air (pattern composite)
- Radars mmWave (haute fréquence)
- Contrôleurs IR Zosung (fragmentation)
- Prises multi-gang (multi-endpoint)
- Sonoff, Legrand, Philips Hue (clusters propriétaires)

---

## 🔄 PHASE 5 — COUCHES D'ÉLITE L9-L11 (PLANIFIÉ)

| Couche | Rôle | Fichier cible | Statut |
|--------|------|---------------|--------|
| L9 | SessionManager (IR Zosung) | `lib/session/SessionManager.js` | 📝 Spécifié |
| L10 | HealthMonitor (heartbeat) | `lib/health/HealthMonitor.js` | 📝 Spécifié |
| L11 | SanityFilter (anti-ghost) | `lib/filter/SanityFilter.js` | 📝 Spécifié |

---

## 📋 ARCHITECTURE — RÈGLES NON NÉGOCIABLES

1. **Runtime 100% local** : Zéro appel cloud dans l'app Homey
2. **Bundle < 7 Mo** : `.homeyignore` exclut `.github/`, `scripts/`, `docs/`
3. **SDK 3.0** : `this.homey`, `async/await`, `try-catch` sur Flow Cards
4. **Boutons bidirectionnels** : Rule 1.1 (dedup), 1.2 (physical), 1.3 (zero-defect)
5. **Fingerprints** : `manufacturerName` + `modelId` via `CaseInsensitiveMatcher.js`
6. **Dual-app** : `master` = expérimental, `stable-v5` = production
7. **Shadow Release** : Aucune annonce publique avant validation interne
8. **Pas de forum posting automatique** : Tout manuel

---

## 🔑 SECRETS GITHUB REQUIS

| Secret | Usage | Provider |
|--------|-------|----------|
| `XIAOMI_MIMO_API_KEY` | Génération drivers | XiaomiMimo v2.5 Pro |
| `NVIDIA_API_KEY` | IA gratuite (priorité) | NVIDIA NIM |
| `OPENAI_API_KEY` | Fallback validation | OpenAI |
| `DEEPSEEK_API_KEY` | Analyse raisonnement | DeepSeek |
| `HF_TOKEN` | Aggrégateur gratuit | HuggingFace |
| `GROQ_API_KEY` | Inférence rapide | Groq |
| `HOMEY_PAT` | Publication Homey Store | Athom |

---

**Prochaines étapes** : Implémenter L9-L11, enrichir le catalogue de drivers, optimiser l'orchestration IA.