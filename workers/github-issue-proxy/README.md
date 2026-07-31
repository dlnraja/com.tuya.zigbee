# github-issue-proxy (P92.83)

Cloudflare Worker — relais **optionnel** pour les rapports « enigma » de l'app Homey.

## Pourquoi optionnel ?

Le canal **par défaut** reste le rapport **100 % local** (P92.78) : l'utilisateur copie le
markdown et le colle dans une issue. Ce Worker n'est qu'un **second canal** pour ceux qui
veulent l'envoi automatique — il n'est requis par RIEN dans l'app.

## Modèle de sécurité

- `GITHUB_PAT` vit **uniquement** dans un secret Cloudflare (`wrangler secret put`) —
  jamais dans ce dépôt, jamais dans l'app Homey.
- POST `/report` uniquement, JSON strict validé (mfr/model/driver/logs).
- Caps : corps 2 Ko, 500 chars/bloc, 10 blocs max.
- Rate limit : 5 rapports/IP/heure.
- Sanitisation : URLs hors `github.com` masquées, caractères de contrôle supprimés.
- Issues créées avec labels `user-report` + `enigma` — aucun autre privilège.
- GET `/health` pour le monitoring.

## Déploiement (une fois, compte Cloudflare gratuit — 100k req/jour inclus)

```bash
npm i -g wrangler
cd workers/github-issue-proxy
wrangler login
wrangler secret put GITHUB_PAT   # PAT GitHub, scope minimal (issues sur ce repo)
wrangler deploy
# → https://github-issue-proxy.<ton-compte>.workers.dev
```

## Côté app Homey

L'utilisateur qui veut l'envoi automatique renseigne l'URL du Worker dans le setting
app `issue_report_endpoint` (vide par défaut = aucun envoi réseau).
Voir `lib/tuya/TuyaZigbeeDevice.js` → `_generateIssueReport()`.
