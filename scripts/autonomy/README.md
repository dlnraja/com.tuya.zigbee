# scripts/autonomy

Autonomous decision layer (P3097). Runs in GitHub Actions only; no external agent needed.

| File | Purpose |
|---|---|
| `decide.js` | Deterministic engine: event → fix / hold / port / publish / defer from `config/autonomy-policy.json`, with confidence, scoped overrides and a bounded decision log. |
| `sanitize.js` | Third-party text is inert data: strips invisible characters, caps size, strict mfr/pid/DP/cluster formats, trusted-source allowlist. |
| `crash-triage.js` | Groups crash/diag reports by signature, ranks impact × users, maps known safe fix patterns. |

Rules: `docs/rules/AUTOMATION_FIRST.md`, `docs/rules/AUTONOMY_SAFETY.md`. Map: `docs/knowledge/AUTONOMY_MAP.md`.
