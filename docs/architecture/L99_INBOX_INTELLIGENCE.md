# L99 Inbox Intelligence (P2352)

> Auto-maintained pointer. Last run: **2026-09-04T17:51:33.572Z** (`full`).

## Pourquoi / Comment / Pour qui / Quand / Contre quoi

| | |
|---|---|
| **Pourquoi** | One regular loop for Gmail + GitHub issues/PRs + Homey forum + driver/couple gates |
| **Comment** | `npm run inbox:l99` → `tools/ci/l99-inbox-intelligence-orchestrator.js` + GHA `l99-inbox-intelligence.yml` |
| **Pour qui** | CI + maintainers; users only via silent code / Homey Test publish |
| **Quand** | Cron every 4h (after forum-poll :45), `workflow_dispatch`, hooks from forum-poll / auto-enrich |
| **Contre quoi** | Forum AI paste, inventing productIds, blind `align-mfs --apply`, Stable overwrite of master Test |

## Shadow rules

- `FORUM_AUTO_POST=0` · `SHADOW_FORUM=1` · `DISCOURSE_WRITE=0`
- Never invent `productId`. Sacred couple = manufacturerName + productId.
- Cartesian multi-gang registry locks are refused (P2351).

## Latest snapshot

| Channel | Value |
|---------|-------|
| Open issues | 1 |
| Open PRs | 0 |
| Forum needAction | 48 |
| Top priority | forum-need-action (75) |
| Report | `reports/l99-inbox-2026-09-04/PRIORITY.md` |

## Related workflows

- `l99-inbox-intelligence.yml` (primary)
- `forum-poll.yml` (silent scan → calls inbox L99 soft)
- `auto-enrich-closed-loop.yml` / `recurrent-orchestrator.yml`

Config: `config/enrichment/l99-inbox-intelligence.json`
