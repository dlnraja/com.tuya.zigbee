# 🧠 Architecture AI — 3 Couches Distinguées

> **Version**: 1.0.0 | **Date**: 2026-05-18
> **But**: Distinguer clairement les 3 couches d'IA qui opèrent dans ce projet, leurs contextes d'exécution, secrets, et responsabilités.

---

## 📊 Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────┐
│                    COUCHE 1 : IA IDE LOCALE                      │
│  (Claude Code / Cursor / Windsurf / Antigravity sur votre PC)    │
├─────────────────────────────────────────────────────────────────┤
│  Exécution : machine locale (Windows 11)                        │
│  Contexte : .clinerules, .cursorrules, .windsurfrules           │
│  Secrets : aucun (vos API keys personnelles optionnelles)        │
│  Trigger : vous démarrez manuellement                           │
│  Périmètre : tout le codebase (lecture/écriture illimité)        │
│  Actions : git commit, push, création de fichiers, debug         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    COUCHE 2 : IA GITHUB ACTIONS                  │
│  (ai-helper.js, ai-ensemble.js, master-ai-battle.js, workflows) │
├─────────────────────────────────────────────────────────────────┤
│  Exécution : runners GitHub (ubuntu-latest)                     │
│  Contexte : project-rules.js charge .windsurfrules + docs       │
│  Secrets : HOMEY_PAT, GH_PAT, GOOGLE_API_KEY, DISCOURSE_API_KEY │
│  Trigger : cron (nightly/sunday), push, PR, workflow_dispatch   │
│  Périmètre : scripts .github/scripts/ + drivers/ (lecture)      │
│  Actions : analyse, cross-ref, forum (T140352), auto-PR, enrich │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   COUCHE 3 : RUNTIME HOMEY                       │
│  (app.js, drivers/*/device.js, lib/tuya/, lib/battery/)          │
├─────────────────────────────────────────────────────────────────┤
│  Exécution : serveurs Homey Pro (Athom cloud)                   │
│  Contexte : SDK3, zigbee-clusters, homey-zigbeedriver           │
│  Secrets : aucun (runtime 100% local, zero cloud API calls)      │
│  Trigger : device onNodeInit, pairing, DP events, flow cards     │
│  Périmètre : son propre device (this), pas de filesystem        │
│  Actions : setCapabilityValue, sendTuyaCommand, flow triggers   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🖥️ Couche 1 : IA IDE Locale (Votre Machine)

### Environnement
- **OS** : Windows 11
- **IDE** : Cursor, VS Code + Antigravity, Windsurf, Claude Code CLI
- **Shell** : cmd.exe, PowerShell
- **Node** : >=22.0.0

### Configuration
- `.clinerules` — Règles spécifiques Claude Code / Cline / Roo Code
- `.cursorrules` — Règles Cursor AI (identiques à .clinerules)
- `.windsurfrules` — Règles Windsurf (version enrichie)
- `.cascade` — Règles Cascade (Codeium)

### Fichiers chargés au démarrage
1. `AI_CONTEXT_MANDATE.md` — Architecture 11-layer, dual-app branches
2. `docs/GLOBAL_INVESTIGATION_PLAN.md` — Framework 22 sections
3. `docs/rules/CRITICAL_MISTAKES.md` — Erreurs critiques A-K
4. `docs/rules/DEVELOPMENT_RULES.md` — Règles dev R1-R8
5. `docs/rules/ZIGBEE_TUYA_RULES.md` — Règles Tuya spécifiques
6. `docs/ARCHITECTURAL_RULES.md` — Règles architecturales R1-R26

### Capacités
- Lecture/écriture de tous les fichiers
- Exécution de commandes locales (node, git, npx)
- Accès à internet (scraping, recherche)
- Modification du codebase (drivers, lib, docs, workflows)
- Git commit, push, PR

### Limitations
- Pas de déploiement Homey (ne pas utiliser `npx homey app publish`)
- Pas d'accès aux secrets GitHub

---

## 🤖 Couche 2 : IA GitHub Actions (CI/CD Automatisée)

### Scripts IA

| Script | Fonction | Provider |
|--------|----------|----------|
| `ai-helper.js` | Moteur principal 10 providers | OpenRouter→HF→Cerebras→Together→Groq→DeepSeek→Gemini→GitHub→Mistral→Kimi |
| `ai-ensemble.js` | Routing intelligent par tâche | gemini/deepseek/llama70b/gpt/hf/mistral/kimi |
| `master-ai-battle.js` | 3 groupes de variants | TZE200↔TZE204↔TZE284 / TZ3000↔TZ3210↔TZ3400 / TYZB01↔TYST11 |
| `project-rules.js` | Injection contexte GIP+GLOBAL+ZIGBEE | Charge docs → fullSysPrompt |
| `cross-ref-intelligence.js` | 5-source cross-ref | Diagnostics × Forum × GitHub × Z2M × AI |

### Workflows utilisant l'IA

| Workflow | Cron | Actions IA |
|----------|------|------------|
| `nightly-auto-process.yml` | 02:00 UTC daily | Analyse fingerprints, cross-ref section 1/7/8/9/17 |
| `driver-maintenance.yml` | Friday 04:00 UTC | Full investigation plan, 10 providers, auto-fix |
| `sunday-master.yml` | Sunday 06:00 UTC | triage-johanbendz, fork_scan, enrichment, ai-battle |
| `sync-johan.yml` | 02:30 UTC Wed/Sat | Sync JohanBendz upstream avec GIP context |

### Pipeline IA Circulaire (10 Providers)
```
OpenRouter (fallback libre)
  → HuggingFace (open source)
    → Cerebras (ultra-rapide)
      → Together (open source)
        → Groq (ultra-rapide LPU)
          → DeepSeek (reasoning)
            → Gemini (multi-modal)
              → GitHub Models (Azure)
                → Mistral (européen)
                  → Kimi (chinois)
```

### Secrets GitHub Requis

| Secret | Usage | Priorité |
|--------|-------|----------|
| `HOMEY_PAT` | Publication Homey | 1 |
| `GH_PAT` | Cross-repo GitHub | 2 |
| `GOOGLE_API_KEY` | Analyse AI Gemini | 3 |
| `DISCOURSE_API_KEY` | Forum Homey (T140352) | 4 |
| `HOMEY_EMAIL` + `HOMEY_PASSWORD` | Forum fallback | 5 |

### Règles Importantes
- **Shadow Mode** : Pas de posts forum automatiques sauf T140352
- **Attribution** : Sources Johan/Z2M/ZHA = silencieux, jamais mentionnés
- **Circuit Breaker** : Rate limits gérés par `_cb` dans ai-helper.js
- **Backoff exponentiel** : 1s → 2s → 4s → 8s → 16s → 30s max

---

## 🏠 Couche 3 : Runtime Homey (Sur les Serveurs Athom)

### Environnement
- **Runtime** : Node.js embarqué Homey Pro (2023/ Early 2024)
- **SDK** : Homey SDK v3 + homey-zigbeedriver v2.x
- **Zigbee Stack** : zigbee-clusters v2.x (ZCL natif)
- **Tuya Stack** : TuyaEF00Manager (DP 0xEF00), TuyaZigbeeDevice

### Architecture Runtime
```
app.js (init)
  └── drivers/ (100+ drivers Zigbee + WiFi)
       └── device.js (onNodeInit)
            ├── HybridSwitchBase / UnifiedSwitchBase
            ├── HybridSensorBase / UnifiedSensorBase
            ├── BaseUnifiedDevice (L14 Hardened)
            │    ├── TuyaZigbeeDevice (L12-L14)
            │    │    ├── TuyaEF00Manager (DP Engine)
            │    │    ├── TuyaCommandSender (Queue 200ms)
            │    │    └── DataRecoveryManager
            │    ├── UnifiedBatteryHandler (Runtime Probe)
            │    └── IntelligentFrameAnalyzer
            ├── PhysicalButtonMixin
            └── VirtualButtonMixin
```

### Ce que le Runtime PEUT faire
- `this.setCapabilityValue('onoff', true)` — Mise à jour capabilities
- `this.homey.flow.getDeviceTriggerCard('id').trigger(...)` — Flow triggers
- `this.sendTuyaCommand(dps)` — Envoi commandes DP
- `this.registerCapabilityListener('onoff', handler)` — Écoute changements
- `this.getSettings()`, `this.getStore()` — Accès config

### Ce que le Runtime NE PEUT PAS faire
- ❌ Lire/modifier des fichiers (pas de fs.writeFile)
- ❌ Faire des requêtes HTTP externes (zero cloud API)
- ❌ Exécuter des commandes shell
- ❌ Scraper des sites web
- ❌ Faire des git commits
- ❌ Accéder aux GitHub Secrets

### Règles Runtime Critiques
1. Toujours `await this.setCapabilityValue()` — L14 SanityFilter intégré
2. Toujours `async onNodeInit()` — Pas de sync onInit
3. Jamais `this.homey.zigbee.getDevice()` — SDK v2 interdit
4. Toujours `onDeleted()` + `onUninit()` — Libération ressources
5. `zb_model_id` PAS `zb_modelId` — Settings keys critiques
6. Backlight = strings `"off"`/`"normal"`/`"inverted"` PAS numbers

---

## 🔄 Matrice de Responsabilités

| Tâche | IDE Locale | GitHub Actions | Runtime Homey |
|-------|:----------:|:--------------:|:-------------:|
| Créer/modifier drivers | ✅ | ❌ (report-only) | ❌ |
| Debug device.js | ✅ | ❌ | ❌ |
| Lint / Validate | ✅ | ✅ | ❌ |
| Cross-ref fingerprints | ✅ | ✅ | ❌ |
| Scraper forums/Z2M | ✅ | ✅ | ❌ |
| Envoyer commandes Tuya | ❌ | ❌ | ✅ |
| Trigger flow cards | ❌ | ❌ | ✅ |
| Analyser batterie | ✅ | ✅ | ❌ |
| Publier sur Homey Store | ❌ | ✅ (via HOMEY_PAT) | ❌ |
| Post sur forum T140352 | ❌ | ✅ (Shadow Mode) | ❌ |
| Git push / PR | ✅ | ✅ | ❌ |
| Enrichir docs | ✅ | ✅ | ❌ |
| Lire/modifier secrets | ❌ | ✅ | ❌ |
| Scraper emails (IMAP) | ✅ | ✅ | ❌ |

---

## 🔐 Sécurité & Secrets

### Règle d'Or
- **Secrets GitHub** → jamais commités, jamais dans le code runtime
- **HOMEY_PAT** → seulement dans GitHub Secrets, utilisé par workflows
- **Runtime Homey** → zero secrets, zero credentials, zero cloud API calls

### Vérification (Runtime)
```javascript
// ✅ BON : Runtime totalement local
const response = await this.sendTuyaCommand({ 1: true });

// ❌ MAUVAIS : Appel cloud depuis le runtime
// const response = await fetch('https://api.tuya.com/device/command');
```

---

## 📚 Références

- `AI_CONTEXT_MANDATE.md` — Architecture complète 11-layer
- `docs/GLOBAL_INVESTIGATION_PLAN.md` — Framework 22 sections
- `.github/scripts/ai-helper.js` — Moteur IA 10 providers
- `.github/scripts/ai-ensemble.js` — Provider routing
- `.github/scripts/master-ai-battle.js` — Variant battle
- `.github/scripts/project-rules.js` — Project rules loader
- `lib/tuya/TuyaZigbeeDevice.js` — Runtime base class (L12-L14)
- `lib/battery/UnifiedBatteryHandler.js` — Runtime batterie probe
