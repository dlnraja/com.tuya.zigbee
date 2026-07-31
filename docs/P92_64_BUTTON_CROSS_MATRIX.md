# P92.64 — Boutons : matrice croisée de toutes les implémentations & versions gagnantes

> 2026-07-31. Croisement exhaustif : notre historique (8 branches), forum (2039 posts),
> GitHub issues/PRs/commentaires (nôtres + Johan upstream 1241 issues/234 PRs/110 forks),
> forks Johan + nôtres (packetninja…), z2m herdsman-converters, ZHA zhaquirks, Hubitat
> (kkossev), deCONZ, openHAB, SmartThings, changelogs Homey (SDK + firmware).
> Politique d'import : **faits et patterns uniquement** (empreintes, clusters, encodages,
> timings) — aucune copie de code. Sources citées ligne par ligne ci-dessous.

## 1. Le mécanisme central (toutes sources concordantes)

Les interrupteurs sans fil Tuya **n'utilisent pas** les commandes ZCL standard pour les appuis.
Ils envoient une **commande propriétaire sur le cluster genOnOff (0x0006)** :

| Commande | Nom z2m | Payload | Encodage |
|---|---|---|---|
| **0xFD** | `tuyaAction` | uint8 (+buffer) | **0=single, 1=double, 2=hold/long** |
| **0xFC** | `tuyaAction2` | uint8 | **0=rotate_right, 1=rotate_left** (2=stop) |

- Identité du bouton = **endpoint source** (EP1..N pour N gangs). Exception : TS0041/TS0041A
  peuvent exposer plusieurs endpoints mais n'ont qu'un bouton.
- Variantefamille DP : les télécommandes TS0601 envoient leurs appuis en **datapoints EF00** —
  **DP n° = bouton, valeur 0/1/2 = single/double/hold**, DP10 = batterie (z2m `tuya_remote`).
- BSEED TS0726 (interrupteurs muraux à relais, mode scène) : même commande 0xFD, endpoint = gang,
  press-type ignoré → `scene_N` (z2m `TS0726_action`).
- SOS TS0215A/TS0218 : **IAS**, pas Tuya DP — cluster ssIasAce (0x0501) cmd Emergency (0x02)
  (+ Arm 0x02 avec armMode 0-3). Fallback : bind ssIasAce **et** ssIasZone.
- HOBEIAN ZG-101ZL : cluster **0xE001** + rapports d'attributs onOff (analyse mainteneur, forum #907).

Sources : [z2m tuya.ts](https://raw.githubusercontent.com/Koenkk/zigbee-herdsman-converters/master/src/lib/tuya.ts),
[zhaquirks/tuya/__init__.py](https://raw.githubusercontent.com/zigpy/zha-device-handlers/dev/zhaquirks/tuya/__init__.py),
[Hubitat TS004F.groovy](https://raw.githubusercontent.com/kkossev/Hubitat/development/Drivers/Tuya%20TS004F/TS004F.groovy),
[deCONZ button_maps.json](https://raw.githubusercontent.com/dresden-elektronik/deconz-rest-plugin/master/button_maps.json).

## 2. Matrice famille × méthode gagnante × preuve datée

| Famille | Méthode qui marche | Preuve utilisateur (datée) |
|---|---|---|
| BSEED TS0726 4-gang (`_TZ3002_pzao9ls1`) | rapports attr onOff par endpoint + binding explicite EP2-4 | #1395 « all four physical buttons work » v5.8.30/5.8.78 (2026-02-09) |
| BSEED/Zemismart TS0001-13 | pattern packetninja : attr onOff + fenêtre app-command 2000 ms, profil `zcl_only` | PR #116 ; #1243/#1264 OK (2026-01) ; v5.11.x = ligne gagnante |
| Moes TS0044 (`_TZ3000_zgyzgdua`) | cluster **0xE000** interception multi-niveaux | #660 « It works! » ; #1030/#1152/#1352 (E000 work 2026-01/02) |
| ZG-101ZS/TS0044 (`_TZ3000_bgtzm4ny`) | single via chemin standard ; **double/long via cmd 0xFD OnOff → OnOffBoundCluster** | #1397 → #1408 « buttons now work perfectly » v5.9.14 → root cause #1416 v5.9.20 |
| TS0044 `_TZ3000_u3nv1jwk` | E000 BoundCluster + listeners directs + DP + logger trames | #2100/#2104 ✅ « Corrigé » (v10.1.x) |
| TS0041 (`_TZ3000_yj6k7vfo`…) | mode scène 0x8004=1 + `button_mode`=scene + `commandRecall` | P27.1/P28 ; GH #334/#410 (récurrent ×3 → routé `button_wireless_4_ts0041`) |
| TS0043 LoraTap (`_TZ3000_famkxci2`) | profil `zcl_only` + fix nom cluster multistateInput | bd7bf07b8, ff1959397 |
| TS004F knob | 0x8004=1 + E000 + LevelControl step/move/stop (mode commande ET événement) | #551 ; v10.1.2 |
| SOS TS0215A | réécriture enrollment IAS Zone (bridgeId IEEE) + IAS ACE + DP | #615 ✅ (2025-12-11) |
| HOBEIAN ZG-101ZL | **0xE001 + rapports attr onOff** — jamais confirmé avant P92.64 | #1242 « not working » → fix P92.64 (pairing HOBEIAN + chemin E001) |
| TS0726 BSEED scène | 0xFD endpoint=gang → `scene_N` | z2m `TS0726_action` (référence) |

## 3. Versions qui marchent le mieux (verdict croisé)

- **Upstream Johan** : **v0.2.76** (2026-03-30, restauration confirmée par utilisateurs pour
  TS0014/TS0044, issue #1356). Points douloureux jamais résolus upstream : #996 (knob),
  #423/#424 (TS004F clicks), #864 (double-fire `_TZ3000_wkai4ga5`), #142/#270/#274.
- **Notre app** : ligne **v5.11.x (2026-02)** pour BSEED (ZCL-only + profils) ; **v10.x (2026-07)**
  pour la couverture E000/DP/raw ; **v10.3.0+ (P92.63)** pour la cohérence press-type.
- **Facteur plateforme** : la régression Zigbee du firmware Homey **v10.3.0 (2024-02)** —
  end-devices ne rejoignent plus — n'a été corrigée qu'en **v12.13.0 (2026-03)**. Cause externe
  n°1 des « bouton muet » intermittents sur télécommandes endormies en 2024-2025. Nos
  mitigations : rebind on announce + récupération mode scène + magic packet (P92.64).

## 4. Leçons des bugs importés (fixes P92.64)

| Source | Bug | Fix importé |
|---|---|---|
| z2m **#8072** | configurer le reporting `batteryPercentageRemaining` sur télécommandes TS004x endormies → décrochage réseau horaire, « needs 2 presses », LED clignotante | `BatteryRouter` + `smart_knob_rotary` : **plus aucune config de reporting** sur boutons endormis ; écoute passive + lecture au réveil |
| z2m **#20024** | retransmissions désordonnées : 1 seul TSN mémorisé laisse passer les doublons | **ring des 5 derniers TSN** par gang (fenêtre 5 s) |
| z2m **#8149** / ZHA | 0xFD non-standard → pas de default response → l'appareil retarde le 2ᵉ clic | dedup TSN renforcé + debounce temporel (l'ACK ZCL n'est pas contrôlable via le SDK Homey — mitigation équivalente) |
| Hubitat kkossev | `_TZ3000_vp6clf9d`, `_TZ3000_ur5fpg7p`, `_TZ3000_wkai4ga5`, `_TZ3000_gbm10jnj` : retransmissions > TSN | **profils `debounceMs: 1200`** (debounce profil-aware) |
| z2m `configureMagicPacket` / ZHA quirk | sans « magic packet » genBasic, certaines télécommandes endormies cessent d'émettre | `_sendTuyaMagicPacket` one-shot à l'init (attrs 0x0004/0x0000/0x0001/0x0005/0x0007/0xfffe) |
| packetninja `f535733f` + issue #121 | `_TZ3000_an5rjiwd` routé `switch_1gang` → « 1 bouton, rien ne se passe / délai 10 min » | re-routé **`button_wireless_4`** (4 combos de casse) + mfs_db |
| packetninja `e8cdb89f` | cartes `switch_4gang_physical_gangN_{single,double,long,triple}` tirées par le mixin mais **absentes** → triggers morts | **16 cartes ajoutées** (ids alignés sur le mixin : `_long` pas `_long_press`) |
| forum #1242/#907 | HOBEIAN ZG-101ZL ne pairait pas (mfr absent) et presse invisibles | HOBEIAN (+variantes) dans `button_wireless_1` ; **chemin brut 0xE001** dans L1 |
| ZHA ts004f | vitesse de rotation : step_size **13=lent, 37=rapide** | token `speed` (slow/normal/fast) sur les 4 triggers rotate du knob |
| z2m #25053 | même mfr+model = 2 produits distincts (TS004F `_TZ3000_abrsvsou`) | noté : désambiguïsation par `applicationVersion` (145 vs 66) — backlog |
| openHAB/ZHA | bascule manuelle de mode (maintenir boutons 2+3 ~5-10 s) | backlog : listener attr 0x8004 pour refléter le changement dans les settings |

## 5. État des lieux après P92.64 (toutes méthodes actives, avec fallbacks)

1. **0xFD/0xFC OnOff propriétaire** — L1 raw + listeners nommés + OnOffBoundCluster ✓
2. **Scenes recall (0x0005)** — PRESS_MAP multi-endpoint + convention 1-16/17-32/33-48 mono-endpoint ✓
3. **E000 (0xE000)** — BoundCluster + listeners directs + L1 raw ✓
4. **E001 (0xE001)** — BoundCluster + L1 raw (nouveau P92.64) ✓
5. **Tuya DP (0xEF00)** — DP=bouton, valeur 0/1/2, exclusion croisée batterie (B8) ✓
6. **IAS (0x0500/0x0501)** — ACE + Zone, enrollment réécrit ✓
7. **MultiStateInput (0x0012)** — presentValue 1/2/3 ✓
8. **LevelControl (0x0008)** — step/move/stop → rotation/long (mode commande TS004F) ✓
9. **OnOff attr reports** — machine à états + profils timing par fabricant (~70 profils) ✓
10. **OnOff commands standard** — fallback mode commande (single) ✓

Dedup en couches (le pattern gagnant — chaque suppression de couche dans l'historique a causé
une régression visible) : **TSN ring-5 (5 s) → debounce profil (200-1200 ms/gang) → raw dedup
350 ms → anti-trigger 500 ms/bouton → dedup virtuel/physique 2000 ms**.

## 6. Backlog identifié

- ✅ FAIT (P92.65) : listener attr 0x8004 → bascule manuelle de mode synchronisée dans les settings ;
  flag `scene_mode_switch_failed` persisté pour diagnostics ; préférence `reverse_button_order`
  (Hubitat, remotes numérotées 3,4,2,1) sur les 5 drivers multi-boutons.
- ✅ FAIT (P92.66) : **carte matrice dropdown** `button_matrix` (pattern Hue RWL022/Aqara) —
  une carte, dropdowns bouton 1-8 × action single/double/long/triple/release, tirée au routeur
  central + sur release ; `_tryCard` tolère device-cards ET app-cards (arg device).
- Désambiguïsation TS004F par `applicationVersion` (z2m #25053) — toujours ouvert.
- ACK ZCL default-response explicite si le SDK l'expose un jour (z2m #8149).

## 8. Autres apps Homey (P92.66) — patterns vérifiés et verdict

| App | Pattern | Chez nous |
|---|---|---|
| Hue (`com.philips.hue.zigbee` sdk3) | RWL022 : 1 carte dropdown 4 boutons × 4 actions ; RDM001 : set de cartes swappé selon setting mode (rocker/pushbutton) | ✅ matrice P92.66 ; ✅ `button_mode` + sync 0x8004 P92.65 |
| Hue ROM001 | pressed-odd/even (position toggle) | backlog (faible valeur) |
| Aqara (`com.xiaomi-mi`) | multistateInput presentValue 1/2/3/0/255 ; dual-card spécifique + générique tokens ; dedup lastKey 3 s ; write mode:1 au pairing (Opple) | ✅ générique `button_pressed` tokens + matrice ; ✅ dedup en couches ; ✅ write 0x8004 au pairing |
| IKEA (athombv tradfri-example) | bound clusters ; long-press tiré AU RELEASE (move→store, stop→fire) | ✅ release synthèse + native (B12) |
| Sonoff (`tech.sonoff`) | onOff commands → sémantique clicks | ✅ couvert (B1 mapping unifié) |
| ubisys | inputs physiques comme triggers + programmation on-device | hors scope (actionneurs) |
| ROBB smarrt | carte app-level multi-drivers + tokens | ✅ matrice app-level |
| SDK Homey | capability `button` = virtuel UI uniquement, pas de trigger ; auto-cards non générées pour sous-capabilities | architecture conforme |

**Scan exhaustif des forks (P92.66)** : 100 forks Johan comparés (43 divergents) + 10 forks
dlnraja — seuls éléments récupérables déjà importés (packetninja : `_TZ3000_an5rjiwd`, cartes
switch_4gang). theswim (custom_button_4_gang), IsaacNZ2, Stephan-de-Jong, baschte, AreAArseth :
tous strictement plus anciens ou hors boutons. **Notre stack est le superset du réseau.**

## 7. Tests de non-régression

`test/button-cross-source-enrichment.test.js` — 12 tests pinant chaque fix de ce document.
