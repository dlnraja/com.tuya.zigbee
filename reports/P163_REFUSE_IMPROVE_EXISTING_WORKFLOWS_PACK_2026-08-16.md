# P163 — REFUSE “améliorer workflows existants” pack (2026-08-16)

Same ask as P159–P162, softer framing. Still **no**.

| Ask | Tip already has / rule |
|-----|------------------------|
| Guess CI is bare `npm test` | False — many workflows; `syntax-check`, auto-publish, gmail, etc. |
| `memory-check` find JSON >2MB | `homey-heap-json-gate.js` (smart) already wired |
| `auto-investigate` / `auto-patch` / `!patch` | Refuse — invents DP/PRs (P147/P161) |
| `stale` auto-close + “fix in develop” | Stale = **mark only**; branches = **master/stable-v5** |
| New `release.yml` Homey publish | Auto-publish already; don’t invent token names |
| Patch “only in CI not Homey” | Good instinct — still don’t auto-generate driver patches from Z2M |

**Generate intelligent-triage / generate-patch?** → **No.**
