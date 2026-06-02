# Security Non-Negotiables

## 1. Secret Protection
- **No Hardcoded Secrets**: Never commit tokens, passkeys, or API keys (`GH_PAT`, `GOOGLE_API_KEY`, `GMAIL_APP_PASSWORD`). 
- **Environment Variance**: Sensitive data must stay in environment variables or local `.env` files (excluded via `.gitignore`).
- **Log Masking**: Any script that logs data must proactively mask strings that resemble secrets or UUIDs.

## 2. PII & Diagnostic Privacy
- **Anonymization**: Before diagnostic data (crash logs, device reports) is posted to GitHub or used in public PRs, it MUST be anonymized.
    - Mask Homey IDs.
    - Mask User Names.
    - Mask localized device names (e.g., "John's Bedroom Light").
- **External Communications**: Only communicate with verified endpoints (GitHub API, official Gmail diagnostic inbox).

## 3. Execution Safety
- **Input Sanitization**: All inputs from issues or PRs (e.g., branch names, issue IDs) used in shell commands must be strictly sanitized.
- **Dry Run First**: Automation that modifies the repository or merges PRs must support a `DRY_RUN` mode.
- **Verification Loop**: Any code generated or modified by AI must be validated (e.g., `homey app validate`, `npm test`) before being proposed for merge.

## 4. Agentic Integrity
- **Planning Before Action**: Agents must state their plan and security assessment before modifying the codebase.
- **Shared Memory**: All architectural and security decisions are recorded in `.memory/` to ensure continuity between AI sessions.
