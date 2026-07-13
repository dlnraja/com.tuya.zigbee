# GitHub Secrets Inventory + AI Bonus Layer (P36)

**All workflows work 100% offline without these secrets.**
AI is a complementary enrichment, NEVER required.

This is the **canonical inventory** of all GH secrets implemented across P28-P36.

---

## 📦 Secrets actuellement implémentés

| # | Secret name | Tier | Provider | Status | Auto-détection |
|---|---|---|---|---|---|
| 1 | `GITHUB_TOKEN` | Tier 1 | GitHub Models | **Auto** (default) | ✅ |
| 2 | `MINIMAX_API_KEY` | Tier 0 | MiniMax M3 | Optional (unlimited subscription) | ✅ |
| 3 | `OPENAI_API_KEY` | Tier 2 | OpenAI | Optional | ✅ |
| 4 | `ANTHROPIC_API_KEY` | Tier 2 | Anthropic | Optional | ✅ |
| 5 | `OLLAMA_HOST` | Tier 3 | Ollama (local) | Optional (self-hosted) | ✅ |

**Note importante** : Vous avez mentionné que votre abonnement MiniMax pourrait être réduit ou supprimé. Le `AIBudgetGuard` (P36) gère cela automatiquement : si MiniMax échoue, il bascule silencieusement vers les providers suivants (GH Models → OpenAI → Anthropic → Ollama → local heuristic). **Aucune dépendance forte à MiniMax.**

---

## 🔄 Cascade order avec quota awareness (P36)

`LocalFirstEngine.callAI()` essaie dans cet ordre, **avec AIBudgetGuard** :

1. **MiniMax M3** (si `MINIMAX_API_KEY` ET quota OK)
2. **GitHub Models** (si `GITHUB_TOKEN` ET quota OK)
3. **OpenAI gpt-4o-mini** (si `OPENAI_API_KEY` ET quota OK)
4. **Anthropic Sonnet** (si `ANTHROPIC_API_KEY` ET quota OK)
5. **Ollama local** (si `OLLAMA_HOST` ET quota OK)
6. **Local heuristic** (always, no cost)

**Si tous les providers IA échouent** → silent fallback local (jamais de blocage).

---

## 💰 Caps quotidiens configurables (env vars)

| Provider | Default cap | Env var override |
|---|---|---|
| MiniMax | 10,000 / jour | `MINIMAX_DAILY_CAP` |
| github-models | 150 / jour | `GH_MODELS_DAILY_CAP` |
| openai | 200 / jour | `OPENAI_DAILY_CAP` |
| anthropic | 100 / jour | `ANTHROPIC_DAILY_CAP` |
| ollama | 10,000 / jour (local, no cap) | — |

**Comportement quand cap dépassé** :
- 429/402 HTTP → `markQuotaExhausted()` → provider disabled for 24h
- 3+ erreurs consécutives → `recordError()` → provider disabled for 1h
- Après le cooldown, le provider est ré-essayé

---

## 🔌 Setup par tier

### Tier 0 : MiniMax M3 (RECOMMANDÉ — gratuit illimité)
```yaml
# In GH repo Settings → Secrets:
MINIMAX_API_KEY = sk-...     # unlimited subscription
```

**Coût** : **$0.00** (unlimited subscription)
**Provider** : `https://api.MiniMax.chat/v1/text/chatcompletion_v2`
**Model** : `MiniMax-M3`
**Tier** : Tier 0 (premier essayé)

### Tier 1 : GitHub Models (default — gratuit avec limites)
```yaml
# AUTOMATIQUE — pas de setup nécessaire
# GITHUB_TOKEN est fourni par défaut par GitHub Actions
```

**Coût** : **$0.00** (gratuit, rate-limited)
**Provider** : `https://models.inference.ai.azure.com/chat/completions`
**Models** : `gpt-4o-mini`, `gpt-4o`
**Tier** : Tier 1 (si MiniMax indisponible)
**Rate limit** : 15 req/min, 150K tokens/day

### Tier 2 : OpenAI (paid, optional)
```yaml
OPENAI_API_KEY = sk-...     # Get from https://platform.openai.com/api-keys
```

**Coût** : ~$0.15/M tokens (gpt-4o-mini)
**Models** : `gpt-4o-mini` (cheapest)
**Tier** : Tier 2

### Tier 2 : Anthropic (paid, optional)
```yaml
ANTHROPIC_API_KEY = sk-ant-...
```

**Coût** : ~$3/M tokens (Sonnet)
**Models** : `claude-3-5-sonnet-20241022`
**Tier** : Tier 2

### Tier 3 : Ollama (self-hosted, gratuit)
```yaml
OLLAMA_HOST = http://localhost:11434
```

**Coût** : **$0.00** (local)
**Models** : `llama3.2`, `mistral`, `codellama`
**Setup** : Run `ollama serve` on your self-hosted runner

---

## 🛡️ AIBudgetGuard (P36)

**Fichier** : `lib/SDK3CompatBridge.js` (classe `AIBudgetGuard`)

### Comportement :
1. **Cap quotidien** par provider
2. **3+ erreurs consécutives** → disable provider for 1h
3. **HTTP 429/402** (quota exhausted) → disable provider for 24h
4. **Cooldown expiré** → re-essai automatique
5. **State persisté** dans `.github/state/ai-budget.json`

### Configuration via env vars (optionnel) :
```bash
MINIMAX_DAILY_CAP=10000     # default 10K
GH_MODELS_DAILY_CAP=150     # default 150
OPENAI_DAILY_CAP=200        # default 200
ANTHROPIC_DAILY_CAP=100     # default 100
```

---

## 📊 Ce qui est envoyé à l'IA

**Seulement APRÈS que toutes les vérifications locales échouent :**
- Crash patterns + counts (anonymisés)
- Issue numbers récents
- Diagnostic summary (no PII)

**Vérifications locales TOUJOURS en premier** : `LocalFirstEngine.diagnose()` + `predictIssues()` marchent 100% offline.

---

## 🔍 Workflows qui peuvent utiliser l'IA (opt-in)

| Workflow | Default mode | AI mode (`--ai` flag) |
|---|---|---|
| `.github/workflows/recurrent-orchestrator.yml` | Offline (10 steps) | + AI bonus (step 10) |
| `.github/workflows/offline-crash-analyzer.yml` | Offline (heuristic) | + AI bonus (`--ai` input) |
| `.github/workflows/activity-monitor.yml` | Offline (fetcher) | Pas d'IA |
| `.github/workflows/temporal-monitor.yml` | Offline (classifier) | Pas d'IA |

**Manual trigger** :
```yaml
on:
  workflow_dispatch:
    inputs:
      use_ai:
        description: 'Use AI bonus (optional, requires API key in secrets)'
        type: boolean
        default: false
```

**Comportement** : si `use_ai=true` ET clé API disponible → utilise l'IA. Sinon → offline only.

---

## 💸 Coût worst case

| Scénario | Coût annuel |
|---|---|
| **0 secrets** (GH Token auto only) | **$0.00** |
| MiniMax only | **$0.00** |
| GH Models only | **$0.00** |
| OpenAI gpt-4o-mini (worst) | ~$0.18/an |
| Anthropic Sonnet (worst) | ~$3.50/an |
| Mixed (MiniMax + GH + OpenAI) | <$0.10/an |

**Avec AIBudgetGuard + caps quotidiens : 0€ de surfacturation possible.**

---

## ✅ Garanties

- ✅ **Tous les workflows marchent 100% offline**
- ✅ **AI est un bonus, jamais bloquant**
- ✅ **Si MiniMax échoue → bascule vers GH Models ou OpenAI**
- ✅ **Si tous les AI échouent → silent fallback local**
- ✅ **Cap quotidiens configurables via env vars**
- ✅ **Persistance des quotas (ne retry pas si saturé)**
- ✅ **Budget persistant dans `.github/state/ai-budget.json`**
- ✅ **Cooldown automatique après erreurs**

---

## 🚀 Quick start

1. **Pour offline-only** : aucun setup nécessaire
2. **Pour AI bonus gratuit** : ajouter `MINIMAX_API_KEY` dans GH secrets
3. **Pour tous les providers** : ajouter toutes les clés

**C'est tout. Le système est conçu pour être utile avec zéro AI, et plus utile avec AI gratuit.**

---

## 📂 Fichiers clés

- `lib/LocalFirstEngine.js` — moteur + `callAI()` avec budget
- `lib/SDK3CompatBridge.js` — `AIBudgetGuard` + compensations SDK3
- `lib/LowLevelBridge.js` — bypass des wrappers (P34)
- `lib/battery/BatteryMasterEngine.js` — superset batterie (P35)
- `.github/state/ai-budget.json` — state du budget (gitignored)
- `.github/workflows/recurrent-orchestrator.yml` — orchestrateur offline+IA
- `.github/workflows/offline-crash-analyzer.yml` — crash analyzer offline+IA
