# Forum Homey — fils clés (10/10/2026)

Lu frugalement (1er post + 25 derniers) via l'API JSON Discourse. Réécrit, avec crédit.

| Fil | Auteur | Ce qu'on en retient |
|---|---|---|
| [Aqara & Xiaomi](https://community.homey.app/t/156) | TedTolboom | La 1.18.1 (05/10/2026) a cassé puis réparé les flows des interrupteurs H1/Opple ; appuis perdus aléatoirement (#7390). Aqara refuse de fournir ses firmwares, donc pas d'OTA (Doekse, #7393). « Nœuds inconnus » fantômes après suppression : redémarrage de Homey ou reset Zigbee (SunBeech, #7383-7385). → Leçon : tester les boutons et scènes avant chaque publication, et prévoir un retour arrière rapide. |
| [SONOFF Zigbee](https://community.homey.app/t/36418) | johan_bendz | Multi-voies affichés en « sélecteur de canal » au lieu de voies séparées (MINI-ZB2GS-L, #534). → Nos multi-voies exposent une `onoff` par voie. |
| [Tuya Local](https://community.homey.app/t/154077) | — | Concurrent Wi-Fi local, à suivre pour les appareils Wi-Fi. |
| [Tuya officiel](https://community.homey.app/t/146735) | Athom | Cloud ; utile pour savoir quels appareils les gens ne trouvent pas en Zigbee. |
| [Homey Portal](https://community.homey.app/t/158748) | Athom | 249 € puis 299 € ; anneau de zone pour lumière, volume et température → classe `light` correcte = visible dans l'anneau (déjà traité pour les variateurs). |
| [Self-Hosted Server](https://community.homey.app/t/146971) | Doekse (Athom) | Zigbee via clé radio ; IKEA n'utilise Zigbee que pour Touchlink sur ses produits Matter (#151). |
| [Device Capabilities](https://community.homey.app/t/43287) | Arie J. Godschalk | Voir DEVICE_CAPABILITIES_THREAD.md. |

Fils les plus actifs (/top.json) : Self-Hosted migration, Dashboard Studio, AI Flow Builder, Homey Portal.
Suivi automatique : source `homey-forum-ecosystem` dans data/sources/registry.json (hebdo, 40 posts max par fil et par run, curseur par fil).
