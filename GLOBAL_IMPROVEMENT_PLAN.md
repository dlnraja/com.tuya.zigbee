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

---

## 📐 RÈGLE CRITIQUE : FINGERPRINTS = manufacturerName + productId (COMBINED)

> **Source** : `docs/rules/DEVELOPMENT_RULES.md`, `docs/rules/CRITICAL_MISTAKES.md`, `docs/rules/ZIGBEE_TUYA_RULES.md`

### La loi fondamentale
Un appareil Zigbee est reconnu **si et seulement si** le couple `manufacturerName` + `productId` (modelId) correspond **simultanément** dans un driver.

```
✅ VALIDE : _TZ3000_xyz + TS0002 dans switch_2gang
✅ VALIDE : _TZ3000_xyz + TS0001 dans switch_1gang (même manufacturerName, productId différent)
❌ CONFLIT : _TZ3000_xyz + TS0002 dans switch_2gang ET dimmer_2gang (même couple dans 2 drivers incompatibles)
```

### Règles détaillées
| # | Règle | Source |
|---|-------|--------|
| F1 | Fingerprint = manufacturerName + productId COMBINED (les 2 doivent matcher) | DEVELOPMENT_RULES.md |
| F2 | Un même manufacturerName dans plusieurs drivers est NORMAL (différents productIds) | DEVELOPMENT_RULES.md |
| F3 | Pas de wildcards dans manufacturerName (ex: `_TZE284_*` est INVALIDE) | ZIGBEE_TUYA_RULES.md |
| F4 | Toutes comparaisons manufacturerName/modelId/productId DOIVENT être case-insensitive via `CaseInsensitiveMatcher.js` | DEVELOPMENT_RULES.md |
| F5 | `.toLowerCase()` manuel sur ces champs est INTERDIT dans les drivers | DEVELOPMENT_RULES.md |
| F6 | Settings keys : `zb_model_id` (pas `zb_modelId`), `zb_manufacturer_name` (pas `zb_manufacturerName`) | CRITICAL_MISTAKES.md |
| F7 | Un appareil qui match un productId (ex: TS0601) mais pas le manufacturerName → tenter match via productId + nombre d'endpoints/clusters | DYNAMIC_HEALING.md |

### Cas spéciaux connus
| Cas | Explication | Action |
|-----|-------------|--------|
| BSEED/Zemismart TS0601 | ZCL-only malgré TS0601 → ignorer Tuya DP | Vérifier protocole via interview |
| Immax NEO valve (#260) | Même TS0601 que climate_sensor → FP seulement dans valve_irrigation | Re-pair si mauvais driver |
| `_TZ3000_cauq1okq` TS0002 (Piotr) | Firmware dual-toggle → UNFIXABLE (Z2M #14750) | Documenter comme limitation |
| Capteurs air quality USB | USB-powered mais a measure_battery → supprimer cap batterie, mainsPowered=true | ProductValueValidator |

---

## 🌐 89 URLs DE RÉFÉRENCE — ÉCOSYSTÈME COMPLET

### 🔴 Critique (22 URLs)
| URL | Scope |
|-----|-------|
| `github.com/dlnraja/com.tuya.zigbee` | Repo principal, branches master/stable-v5 |
| `github.com/JohanBendz/com.tuya.zigbee` | Repo source historique |
| `developers.homey.app/sdk/` | Référence SDK 3.0 |
| `developers.homey.app/the-basics/app-manifest` | Manifeste app.json |
| `community.homey.app/t/.../140352` | Thread officiel forum |
| `zigbee.blakadder.com/index.html` | 2693+ devices, fingerprints |
| `zigbee.blakadder.com/all.html` | Liste complète pour scraping batch |
| `zigbee.blakadder.com/Tuya.html` | Tous devices Tuya |
| `github.com/Koenkk/zigbee-herdsman-converters/.../tuya.ts` | Référence DP Tuya Z2M |
| `github.com/blakadder/zigbee/blob/master/devices.json` | DB JSON pour scraping auto |
| `token-plan-ams.xiaomimimo.com/v1` | XiaomiMimo v2.5 Pro (primary IA) |
| `homey.app/a/com.dlnraja.tuya.zigbee.stable/` | App stable production |

### 🟠 Haute (28 URLs)
- Issues/PRs/Actions du repo, `lib/`, `drivers/`
- Z2M/ZHA repos, forums FR/DE
- Docs fabricants : Legrand (`0xFC40`), Hue (`0xFC03`), Xiaomi (`0xFCC0`), Sonoff (`0x0B04`)
- Fallbacks IA : OpenAI, DeepSeek, HuggingFace, Groq

### 🟡 Moyenne (22 URLs)
- Forums CN/JP/RU (Baidu, Zhihu, CSDN, Habr, 4PDA, Qiita)
- Catégories Blakadder (sensors, switches, plugs, covers, hvac)
- Specs Zigbee (ZCL PDF, CSA IoT, Wikipedia)

### 🔵 Basse (15 URLs)
- Specs industrielles (Panasonic, Orvibo, Konke)
- Webhooks monitoring (Discord, Slack, Sentry)
- Documentation legacy

---

**Prochaines étapes** : Implémenter L9-L11, enrichir le catalogue de drivers via scraping hebdomadaire Blakadder+Z2M+ZHA, optimiser l'orchestration IA avec les 89 sources de référence.
