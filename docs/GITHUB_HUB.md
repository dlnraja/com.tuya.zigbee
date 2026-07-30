# 🐙 GitHub Hub

Point d'entrée unique pour la gestion des issues/PRs des deux dépôts
([dlnraja/com.tuya.zigbee](https://github.com/dlnraja/com.tuya.zigbee) et
[JohanBendz/com.tuya.zigbee](https://github.com/JohanBendz/com.tuya.zigbee) en amont).

## Process actuels (2026-07)

- **Diagnostic Auto-Resolver** (`.github/scripts/diagnostic-auto-resolver.js`) — auto-résolution
  avec dédup anti-spam, escalade `needs-maintainer` dès qu'un utilisateur répond.
- **Community Inbox** (`reports/community-inbox.md`) — digest quotidien : issues ouvertes
  classées par dernier intervenant (bot / maintainer / utilisateur), PRs, forum.
- **Dump complet** (`.github/state/johan-dump/`) — issues+PRs tous états des deux dépôts,
  cross-référencés avec les empreintes des drivers.

## Analyses

- [GitHub issues & PR analysis](./GITHUB_ISSUES_PR_ANALYSIS.md)
- Réponses types historiques : [full](./GITHUB_RESPONSES_FULL.md) ·
  [v5.11.15](./GITHUB_RESPONSES_v5.11.15.md) · [v5.11.16](./GITHUB_RESPONSES_v5.11.16.md) ·
  [v5.8.88](./GITHUB_RESPONSES_v5.8.88.md)

## Références

- Registre des scripts : `scripts/_registry.json`
- Index complet de la documentation : [INDEX.md](./INDEX.md)
