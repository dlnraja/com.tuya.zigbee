# GitHub Secrets for AI Bonus Layer (Optional)

**All workflows work 100% offline without these secrets.**
AI is a complementary enrichment, NEVER required.

## Recommended Secrets (Minimal Access)

Add these in: **Settings → Secrets and variables → Actions → New repository secret**

### Tier 1: Free AI (Recommended)

#### `GITHUB_TOKEN` (Auto-provided)
- **Default**: Already available, no setup needed
- **Access**: Provided automatically by GitHub Actions
- **Provider**: GitHub Models API (`https://models.inference.ai.azure.com`)
- **Models**: `gpt-4o-mini`, `gpt-4o`, etc.
- **Cost**: **FREE** for GH users (rate-limited)
- **Rate limit**: 15 requests/min, 150K tokens/day (free tier)
- **Used in**: All workflows with `--ai` flag (LocalFirstEngine.callAI)

**No setup required.** Just use the default `secrets.GITHUB_TOKEN` in workflows.

#### `MINIMAX_API_KEY` (P35 — Unlimited subscription)
- **Provider**: MiniMax API (`https://api.MiniMax.chat/v1/text/chatcompletion_v2`)
- **Models**: `MiniMax-M3`
- **Cost**: **FREE** (unlimited subscription)
- **Setup**: Add as GH secret `MINIMAX_API_KEY`
- **Used in**: Tier 0 (first priority in LocalFirstEngine.callAI)
- **Note**: User has unlimited MiniMax subscription, so this is the preferred provider when available

**Setup**: Add `MINIMAX_API_KEY` as GH secret. Used first in the cascade, before GH Models, OpenAI, Anthropic.

### Tier 2: Direct API Keys (Optional, for higher volume)

#### `OPENAI_API_KEY` (Optional)
- **Get from**: https://platform.openai.com/api-keys
- **Provider**: OpenAI Direct API
- **Models**: `gpt-4o-mini` (cheapest), `gpt-4o` (best)
- **Cost**: ~$0.15/M tokens (gpt-4o-mini)
- **Budget cap**: NEVER set in code (always use `--ai` flag with timeout 10s, max 800 tokens)
- **Safety**: `LocalFirstEngine.callAI()` will abort if all providers fail

#### `ANTHROPIC_API_KEY` (Optional)
- **Get from**: https://console.anthropic.com/settings/keys
- **Provider**: Anthropic Direct API
- **Models**: `claude-3-5-sonnet-20241022`
- **Cost**: ~$3/M tokens (Sonnet)
- **Use case**: Better reasoning for complex crash analysis

### Tier 3: Local AI (For total privacy)

#### `OLLAMA_HOST` (Optional)
- **Get from**: Run Ollama locally (https://ollama.ai)
- **Provider**: Local Ollama server
- **Models**: `llama3.2`, `mistral`, `codellama` (free)
- **Cost**: **FREE** (uses local GPU/CPU)
- **Setup**:
  ```bash
  # On your runner or self-hosted runner
  ollama serve
  # Models are pulled automatically
  ollama pull llama3.2
  ```
- **Used in**: workflows if `OLLAMA_HOST` secret is set to `http://localhost:11434`

## How It Works

`LocalFirstEngine.callAI(prompt, options)`:
1. **Tries in order**: MiniMax (M3) → GitHub Models → OpenAI → Anthropic → Ollama
2. **If all fail** → silent return `null` → engine falls back to local heuristic
3. **Budget cap**: 800 tokens max per call, 10s timeout
4. **Zero blocked workflows**: AI is never required, only enhances

## Cost Analysis (Worst Case)

If all workflows ran with `--ai` every day for a year:
- 4 workflows/day × 365 days = 1,460 AI calls
- × 800 tokens avg = 1.17M tokens
- With MiniMax (unlimited subscription): **$0.00**
- With GH Models free tier: **$0.00**
- With OpenAI gpt-4o-mini: ~$0.18/year
- With Anthropic Sonnet: ~$3.50/year

## What Gets Sent to AI

Only AFTER all local checks fail:
- Crash patterns + counts (anonymized)
- Recently observed issue numbers
- Diagnostic summary (no user data, no PII)

Local checks ALWAYS run first. AI is a sanity check / bonus.

## To Enable AI Bonus in a Workflow

```yaml
# Add this to the job's env
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}  # optional
  ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}  # optional

# Use --ai flag in the script
run: node tools/ci/recurrent-orchestrator.js --ai
```

## Optional: Manual Trigger for AI

```yaml
on:
  workflow_dispatch:
    inputs:
      use_ai:
        description: 'Enable AI bonus layer'
        type: boolean
        default: false
```

Users can opt-in to AI in the Actions tab → Run workflow → Enable AI.

## Security Notes

- AI calls are made via HTTPS to vendor APIs (encrypted)
- No user credentials are sent, only anonymized patterns
- GH_TOKEN is auto-scoped to repo (no write access to other repos)
- OPENAI_API_KEY and ANTHROPIC_API_KEY are read-only at the API level
- All AI calls are logged in the workflow run output

## Backup Mode (if all AI is unavailable)

`LocalFirstEngine.diagnose()` works entirely offline. AI is only consulted via `callAI()`. If `callAI()` returns `null` (no API key, all providers down, or budget exhausted), the engine proceeds with the local heuristic result.

This means **the system NEVER fails because of AI** — it just provides less detailed analysis.

## What If Budget Is Concerned?

- **Tier 1 (GH Models)**: Free for GH users, no budget concerns
- **Tier 2 (OpenAI/Anthropic)**: Use `--ai` flag only when needed
- **Tier 3 (Ollama)**: Free, runs locally, no API costs

The default is **always OFFLINE** (`--ai` not set). AI only runs when explicitly requested.

## Quick Setup (Recommended)

1. **No setup needed for default behavior** — works 100% offline
2. **For AI bonus**: 
   - Ensure `secrets.GITHUB_TOKEN` is available (default, free)
   - Add `OPENAI_API_KEY` for higher volume (optional)
3. **For total privacy**: Run Ollama on self-hosted runner (advanced)

That's it! The system is designed to be useful with **zero AI** and even more useful with **free AI**.
