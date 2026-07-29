# Historique forum de dlnraja (Dylan Rajasekaram, user_id 49770) — community.homey.app

Date du moissonnage : 2026-07-29. Sources brutes : `tmp/forum-dlnraja/` (`posts.json`, `posts_full.json` = 700 posts complets, `thread_140352.json` = 2039 posts du thread principal, images dans `tmp/forum-dlnraja/images/`).

## 1. Périmètre moissonné

- **701 actions** (700 réponses + 1 création de topic) du 2025-02-26 au 2026-07-28.
- **6 topics touchés**, dont 673 posts (96 %) dans le méga-thread **`[APP][Pro] Universal TUYA Zigbee Device App - test`** (topic 140352, 2116 posts au total, 2039 récupérés — les 77 manquants sont des posts supprimés/moderated).
- Autres topics : `app-pro-tuya-zigbee-app` (26439, 15 posts), son propre topic `pointers-for-developing-zigbee-driver-hobeian-zg-303z-soil-sensor` (146667, 6 posts), `app-tuya-connect-any-tuya-device` (106779, 5 posts), `shs-homey-bridge-vs-zigbee2mqtt` (147909), `mehr-kanal-zigbee-aktor` (149237).
- Thread 140352 : 2039 posts analysés, ~400+ participants, top contributeurs après lui : Peter_van_Werkhoven (233), Lasse_K (102), Cam (65), Haadeess (52), Ronny_M (47).

## 2. Timeline de son activité

| Période | Posts/mois | Événements clés |
|---|---|---|
| 2025-02 → 06 | 7 | Premiers posts : suggestions zigbee2mqtt natif dans le thread Athom Tuya (106779) |
| 2025-07 | 28 | Début de son app : « Lite version 150+ drivers » (26439 #5303, 2025-07-28), premier post thread test (#8, 2025-07-25) |
| 2025-08 | 21 | Promet radar 24G `_TZE204_gkfbdvyx` (#5313, tenu) |
| 2025-09 | 46 | Lite v1.0.30 (#162) ; première demande SOS `_TZ3000_0dumfk2z/TS0215A` (#101) — jamais livrée |
| 2025-10 | 149 | Mois le plus intense : v2.15.x→v3.0.x ; bug cluster IDs string→number (#272, corrigé v3.0.35) |
| 2025-11 | 7 | Problèmes médicaux (#520) |
| 2025-12 | 108 | Ère v5.5.x ; gas sensor déplacé (#639, tenu) ; ZG-303Z supporté (v5.5.162/164, topic 146667, tenu) |
| 2026-01 | 133 | Oubli régénération app.json (#932) ; TypeError switch_4gang (#1066) |
| 2026-02 | 47 | **Aveu : « Kimi k2.5 ai a dégradé le code », switch vers Claude 4.6 (#1372)** ; BSEED TS0726 (#1521, tenu) |
| 2026-03 | 40 | Nouvel emploi, ralentit (#1614) ; régressions Loratap (#1679) |
| 2026-04 | 106 | Crashs, « grosse factorisation » (#1800) ; **aveu délégation IA « hallucinations » (#1959, #1973)** |
| 2026-05 | 6 | Fix OOM v8.5.7 (#2050) ; état des lieux « 3 apps / 2 branches » (#2040) |
| 2026-06 | 2 | **#2094 (2026-06-21) : « I have recently stopped development »** |
| 2026-07 | 1 | Dernier post #2116 (2026-07-28) : « i will check asap » (réponse à une demande de dual energy meter) |

Versions annoncées sur le thread : ~200 numéros distincts, de v0.1.45 à v22.0.1 (app.json actuel du repo : **9.0.351**).

## 3. Promesses — tenues vs non tenues

### Tenues (vérifiées dans le code actuel)

| Promesse | Post | État dans le repo |
|---|---|---|
| Radar 24G `_TZE204_gkfbdvyx` | 26439 #5313 (2025-08-11) | `drivers/presence_sensor_radar` ✓ |
| `_TZE284_vvmbj46n` temp/humid | #351 (2025-10-15) | `drivers/climate_sensor` ✓ |
| `_TZE204_chbyv06` → gas_detector | #639 (2025-12-19) | `drivers/gas_detector` + `gas_sensor` ✓ |
| MOES TS0044 `_TZ3000_zgyzgdua` | #694 (2025-12-26) | `drivers/scene_switch_4` ✓ |
| `_TZE284_iadro9bf` ZY-M100-S_2 DP mappings | #698 (2025-12-26) | `drivers/presence_sensor_radar` ✓ |
| HOBEIAN ZG-303Z soil sensor | topic 146667 (v5.5.162/164) | `drivers/soil_sensor` (HOBEIAN + ZG-303Z) ✓ |
| BSEED TS0726 `_TZ3002_pzao9ls1` | #1521 (2026-02-26) | `drivers/wall_switch_4gang_1way` ✓ |
| HOBEIAN ZG-222Z water leak | #2090 → #2111 | `drivers/water_leak_sensor` ✓ (paire, mais pas de données — voir bugs) |
| Fix emoji → SyntaxError Homey Pro | #1682 | vérifié : 0 emoji dans `drivers/**/{driver,device}.js` ✓ |
| Fix OOM démarrage | #2050 (v8.5.7) | versions 9.0.258+ fonctionnelles (screenshots) ✓ |
| Fix luminance figée | #2066/#2089 → v9.0.261 | confirmé par Peter #2113 + screenshot ✓ |

### Non tenues / affirmations inexactes (5)

1. **SOS button `_TZ3000_0dumfk2z` / TS0215A** — demandé 2025-09-13 (#101), interview fourni (#464), relancé #2042, toujours impossible à appairer 2026-06-14 (#2089). mfr présent seulement dans `generic_tuya` **sans** TS0215A. **Jamais livré après ~10 mois.**
2. **Rain sensor `_TZ3210_p68kms0l` / TS0207** — demandé 2026-01-16 (#1004) ; réponse « update released, tell me if done » (#1013) mais le pid TS0207 n'a jamais été ajouté (`sensor_contact_rain` a le mfr, pas le pid).
3. **Loratap 3 boutons `_TZ3000_famkxci2` / TS0043** — « not working anymore » (#1679, 2026-03-31) ; absent de `button_wireless_3`.
4. **IR remote `_TZ3000_tzvbimpq` / TS1201** — « not recognized anymore » (#1745, 2026-04-07) ; TS1201 absent de tout driver (le TS0042 du même mfr est couvert par `button_wireless_2`).
5. **Arteco ZS-SF00 (`A89G12C`)** — affirmé « already included in Soil Moisture Sensor driver » (#1454, 2026-02-20) : **faux**, `A89G12C` absent de tout le repo (seul « Arteco » en productId de `soil_sensor`/`soilsensor_2`).

### Partielles (device couvert mais fonctionnalité cassée)

- `_TZE284_fhvpaltk` valve irrigation (Joep_Vullings) : driver OK (`valve_dual_irrigation`) mais UI « Dim niveau » erronée (#2082 + screenshot), boutons inopérants (#2102, #2105).
- `_TZE284_pcdmj88b` TS0601 (Beck51 #2106) : couvert par `wall_thermostat`, paire mais inutilisable.
- Moes 4 boutons `_TZ3000_u3nv1jw(k)` TS0044 (Jocke_Wallen #2079→#2104, 4 diag reports) : dans `button_wireless_4` mais appuis jamais détectés.
- HOBEIAN ZG-222Z : appairage OK (v9.0.258+) mais « not receiving data » (#2111).

## 4. Bugs confirmés et état actuel

| Bug | Preuve forum | État |
|---|---|---|
| Cluster IDs en string → `expected_cluster_id_number` | #272, #399 | **Corrigé** (v3.0.35) |
| Emoji dans driver.js → SyntaxError | #1682 | **Corrigé** (vérifié par grep, 0 occurrence) |
| app.json non régénéré → fixes inappliqués | #932 | **Corrigé** |
| `TypeError: name undefined` switch_4gang | #1066 | **Corrigé** |
| DP listeners absents capteurs secteur | #721 | **Corrigé** (v5.5.270) |
| OOM au démarrage | #2050 | **Corrigé** (v8.5.7+) |
| Crash v9.0.218 | #2109 (+screenshot « Gecrasht »), #2110 | **Corrigé** (v9.0.258, #2111) |
| Luminance figée (jamais 0 la nuit / 353 lx identiques) | #2066, #2089 (+graphe) | **Corrigé** (v9.0.261, #2113) |
| ZG-222Z waterleak : pas de données | #2111 | **OUVERT** |
| Contact state ne change plus (capteurs porte/fenêtre) | #2114 (2026-07-16) | **OUVERT** |
| Soil sensors détectés « Curtain Module » / unknown | #2091, #2097, #2101 | **OUVERT** (régression) |
| Energy usage exagéré | #2092 | **OUVERT** |
| Valve irrigation : capabilities erronées | #2082, #2102, #2105 | **OUVERT** |
| Moes 4-btn : appuis non détectés | #2079, #2098, #2100, #2104 | **OUVERT** |

## 5. Questions utilisateurs sans réponse (après son ralentissement de juin 2026)

Son dernier post est #2116 ; aucune question postérieure, mais de nombreuses demandes de juin–juillet n'ont reçu aucune réponse substantielle :

- **Jocke_Wallen** #2079/#2098/#2100/#2104 — Moes 4-btn (4 diag reports envoyés, jamais résolu).
- **Tobias-B** #2080 — light sensor toujours cassé après update ciblée.
- **Automagiker** #2081 — Nedis radiator valve appairée comme « Climate Sensor ».
- **Ronald_Bok** #2091 — 3 soil sensors `_TZE200_npj9bug3` ajoutés comme Curtain Module.
- **Lucas360** #2092 — energy usage erroné.
- **blutch32** #2093/#2095/#2101 — soil sensors + ampèremètre cassés depuis 2 mois ; diag fourni ; toujours unknown au 2026-07-03.
- **JiriG** #2097 — soil sensor unknown device.
- **VicBehrens** #2099 — demande Moes 4-gang smart switch (2 semaines d'attente).
- **Beck51** #2106 — `_TZE284_pcdmj88b` inutilisable.
- **Peter_van_Werkhoven** #2107/#2108/#2114 — capteurs porte/fenêtre : plus d'état contact.
- **Nigel_Scott** #2112 — demande d'ajout device (image jointe = simple logo, sans interview).
- **thierry_arguimbau** #2115 — dual energy meter (lien AliExpress) → seule réponse : « i will check asap » (#2116, en attente).
- **Joep_Vullings** #2102/#2105 — valve : batterie OK mais boutons KO.

## 6. Images analysées (10 lues sur 14 téléchargées dans `tmp/forum-dlnraja/images/`)

| Fichier | Post | Contenu extrait |
|---|---|---|
| `p2109_peter_crash.jpg` | #2109 | App « Tuya Zigbee / Unified Smart Home Engine » **v9.0.218 badge rouge « Gecrasht »** ; 4 devices en warning (3 capteurs fenêtre + Sos Fariba) |
| `p2111_peter_waterleak_1.jpg` | #2111 | v9.0.258 : plus de crash ; capteurs affichent 57/57/0 lx ; **Waterlek Sensor appairé** (ZG-222Z) avec batterie |
| `p2113_peter_luminance.jpg` | #2113 | v9.0.261 : lux différenciés 1319/1998/1619 → **fix luminance confirmé visuellement** ; flow « Alarm Waterlekkage » |
| `p2089_peter_sos_2.jpg` | #2089 | v9.0.13 : lux 1663/2142/1755 figés ; devices Smartknop, Sos Fariba, SOS Noodknop |
| `p2089_peter_lux_1.jpg` | #2089 | Graphe lux « Raam onze slaapkamer » : jamais < ~150 lx même à 5h du matin → preuve du bug luminance |
| `p2066_peter_button_1.jpg` | #2066 | Écran d'accueil : Smartbutton/Sos Fariba/SOS knop grisés, warning « Surveillance » |
| `p2066_peter_button_2.jpg` | #2066 | App « Tuya Unified » v8.1.75 : **3 capteurs contact tous à 353 lx identiques** (valeurs figées) |
| `p2082_joep_valve.jpg` | #2082 | Valve irrigation : UI « DIM NIVEAU » avec 4 entrées « Dim niveau » dupliquées → capabilities erronées |
| `p1679_echonl_2.jpg` | #1679 | Photo produit LoraTap Zigbee (télécommandes 1/2/3/4/6 boutons, Tuya Smart / Smart Life) |
| `p1679_echonl_1.jpg` | #1679 | Photo produit (complément) |
| `p2112_nigel_device.png` | #2112 | Simple logo Phoenix — sans valeur technique |

## 7. Application au projet (faite le 2026-07-29)

Ajout dans `data/mfs_db.json` des 4 couples (mfr, pid) confirmés manquants (source `forum_dlnraja`, confidence 0.6) :

- `_TZ3000_0dumfk2z` + `TS0215A` (SOS emergency button)
- `_TZ3210_p68kms0l` + `TS0207` (rain sensor)
- `_TZ3000_famkxci2` + `TS0043` (Loratap 3 boutons)
- `_TZ3000_tzvbimpq` + `TS1201` (IR remote)

`_meta.lastEnrichment` et `stats.entriesBySource.forum_dlnraja=4` mis à jour. Validation : JSON parse OK ; `fp-collision-check` exit 0, **0 nouvelle collision** (46 courantes, toutes résolues/baseline).

## 8. Contexte notable

- Dylan a explicitement déclaré (#2094, 2026-06-21) avoir « recently stopped development », avec une reprise ponctuelle « next weekend with max of diags logs ».
- Le développement est ouvertement assisté par IA (#1372, #147909, #1959, #1973) ; il reconnaît des régressions introduites par génération (« Kimi k2.5 degraded the code », « hallucinations »).
- Le repo local (branche `master`, app.json v9.0.351) est **postérieur** à la plupart des fixes décrits : les corrections vérifiées ci-dessus sont bien présentes dans le code actuel.
