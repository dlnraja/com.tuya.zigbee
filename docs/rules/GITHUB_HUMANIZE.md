# GitHub voice — human first (P2394)

> Same spirit as Homey T157628 / forum humanize: **do not sound like a bot**.

## Default
1. Prefer **code + silent CI** over GitHub issue walls.
2. When Dylan replies: short, imperfect English OK, “I”, no markdown tables, no patch IDs as headlines, no “Silent update / Auto-resolved / automation cycle”.
3. Automations **must not** auto-comment by default.

## Automations (locked)
| Path | Behavior |
|------|----------|
| `auto-reopen-on-comment.yml` | Reopen + label only — **no comment** |
| `diagnostic-auto-resolver.js` | `DRY_RUN` + `GITHUB_RESOLVER_COMMENT!=1` → no posts |
| `handle-issue-comments.js` | Labels only unless `GITHUB_ISSUE_AUTO_COMMENT=1` |

## If you must comment (human)
- 2–6 short lines
- Say what you checked + what to try (update Test tip)
- Ask for Diagnostic ID only if still broken
- Never: “Auto-resolved by…”, “It will be reviewed in the next automation cycle”, emoji walls, protocol essays

## Salvagr #533 lesson
User closed by mistake → reopen silently. Control bug was Homey idle cancel (P2393). Reply in Dylan voice after fix ships.
