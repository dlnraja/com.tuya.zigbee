# 🌍 Forum Hub

Point d'entrée unique pour tout ce qui concerne le forum Homey
([topic officiel](https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352)).

## Doctrine (P108 / T157628)

- **Default: ne pas répondre sur le forum.** Enrichir l'app / workflows en silence.
- Ne jamais coller des réponses IA non vérifiées ([mandat communauté](https://community.homey.app/t/stop-pasting-unchecked-ai-answers-in-the-homey-community/157628)).
- `REPLY_TOPICS=140352` only; auto-post scripts en dry-run forcé.
- Voix / humanize: [FORUM_STYLE_GUIDE](./responses/FORUM_STYLE_GUIDE.md)
- Règles: [FORUM_SILENT_HUMANIZE](./rules/FORUM_SILENT_HUMANIZE.md)

## Suivi actuel (2026-08)

- [P108 — Forum silent multi enrich](../reports/FORUM_SILENT_MULTI_ENRICH_P108.md)
- [P85 — Forum 2114 door/window](./P85_FORUM_2114_DOOR_WINDOW.md) — capteurs porte/fenêtre (Peter_van_Werkhoven)
- [P87 — Forum-driven MFR mapping](./P87_FORUM_DRIVEN_MFR_MAPPING.md) — routage piloté par les retours forum
- [P22 — Forum fixes 2026-07-13](./P22_FORUM_FIXES_2026-07-13.md)
- Rapports de session récents : `reports/kimi-2026-07-29/` (triage des 13 utilisateurs, 5 bugs forum, historique dlnraja)

## Analyses historiques

- [Forum issues — analyse](./FORUM_ISSUES_ANALYSIS.md)
- [Forum issues — chronologie](./FORUM_ISSUES_CHRONOLOGY.md)
- [Forum issues — consolidé](./FORUM_ISSUES_CONSOLIDATED.md)
- [Réponses forum](./FORUM_RESPONSES.md)

## Communication (brouillons seulement — pas d'auto-post)

- [Forum update v7.2](./FORUM_UPDATE_v7.2.md) · [version EN](./FORUM_UPDATE_EN_v7.2.md) · [teaser v7](./FORUM_TEASER_V7.md)
- [Brouillon de post](./forum_post_draft.md) — passer `forum-ai-paste-gate` avant toute publication manuelle

## Outillage

- `tools/ci/forum-silent-multi-scan.js` — scan multi-threads READ-ONLY (140352, 146735, 26439, 89271, 43287, 157628, 157859)
- `tools/ci/forum-ai-paste-gate.js` — détecteur de collage IA
- `lib/utils/rf-channel-coexistence.js` — Zigbee/Thread ≠ Wi‑Fi channel numbering
- `docs/guides/RF_CHANNEL_COEXISTENCE.md` — guide RF coexistence
- `.github/scripts/reply-quality-gate.js` — gate factual + humanize
- `.github/scripts/forum-responder.js` — dry-run forcé (aucune publication)
- `.github/workflows/forum-poll.yml` — poll + silent multi-scan (6×/jour)
- `reports/community-inbox.md` — digest quotidien (issues + forum sans réponse)
