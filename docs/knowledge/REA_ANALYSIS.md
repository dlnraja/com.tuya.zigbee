# Analyse REA des paquets de build (2026-10-10)

Outil : [REA — Reverse Engineer Anything](https://github.com/morluto/rea) (morluto, licence MIT), v6.3.0,
commande `rea analyze-javascript-application` (analyse statique, aucun code exécuté).
Périmètre strict : nos propres paquets `.homeybuild`, et les paquets npm open source d'Athom
(`zigbee-clusters`, `homey-zigbeedriver`). **Aucun** firmware Homey propriétaire ni binaire OTA Tuya analysé
(les fichiers OTA présents dans `drivers/*/assets/firmware/` ont seulement été comparés en taille / sha256
avec leurs métadonnées du manifeste).

## 1. Comparaison 9.0.1330 (acceptée par Athom) ↔ tip master (refusée, « AggregateError »)
Les deux builds font ~65 Mo / ~4 700 fichiers ; `app.json` 8,71 → 8,73 Mo. REA : 2 028 → 2 037 fichiers JS
parsés, 2 échecs de parsing identiques des deux côtés (pas nouveau).

Delta fichiers (empreintes REA) : +10 ajoutés, 59 modifiés, 0 supprimé.
- Nouveaux drivers : `led_controller_spi_tuya` (Gledopto), `switch_module_whd02`. Images 75×75 / 500×500 PNG
  valides, `icon.svg` valide, `name.en` présent → rien d'anormal côté assets.
- Nouveaux libs : `DpCoalescer`, `SpiPixelColour`, `DeviceClassMigration`, `MemwarnGuard`, `ZigbeeLibBackports`.
- Manifeste : seule clé racine changée = `version`. 49 drivers modifiés, presque tous `zigbee` (listes fabricants).
  Changements notables :
  - **classe** `socket → light` sur `dimmer_2_gang_tuya`, `dimmer_wall_switch`, `wall_dimmer_1gang_1way` ;
  - capacités ajoutées à `panel_switch_cover_tuya` (`windowcoverings_state`, `windowcoverings_set`) ;
  - **nouveau bloc `firmwareUpdates`** sur `water_leak_sensor` (commit auto 9d67cda2bc du 06/10,
    présent seulement à partir de 9.0.1334) ;
  - +615 collisions fabricant+productId entre drivers (variantes de casse « AURORA LIGHTING »,
    `_TYZB01_4lwqwyqn` dans `switch_1gang` ET `switch_3gang`…), issues du même commit auto.
- Cartes de flow : 6 051 → 6 061. Aucune nouvelle anomalie de structure (id dupliqué, arg inconnu, dropdown vide).
  14 nouveaux titres de déclencheurs utilisent `{token}`, mais 2 641 existaient déjà dans la 9.0.1330 acceptée :
  **ce n'est pas la cause du refus**.

Conclusion : REA ne trouve aucun artefact « cassé » propre au tip. Les suspects restants pour le bisect sont les
changements sémantiques ci-dessus (classe de driver, nouvelles capacités, firmwareUpdates, collisions).

## 2. Bug trouvé : plages matérielles OTA vides (toutes les mises à jour OTA)
Sur les 9 drivers avec `firmwareUpdates` (master et stable), `minHardwareVersion > maxHardwareVersion`
(27502 > 20256, 25715 > 24427). 27502 = 0x6B6E, 20256 = 0x4F20 : ce sont des octets ASCII de l'en-tête OTA
mal interprétés, pas de vraies versions. Selon la doc Athom (« Zigbee Firmware Updates »), Homey exige que la version
matérielle soit dans la plage → **aucune de ces mises à jour ne peut jamais être proposée**.
Non corrigé automatiquement (retirer les bornes élargit le ciblage OTA, risque de brick) : à valider à la main,
appareil réel en main. Le nouvel audit le signale (`OTA_HW_RANGE_EMPTY`).

## 3. Paquets Athom open source
- `homey-zigbeedriver` 2.2.17 → **2.2.18** : corrige la course on/off + dim de `ZigBeeLightDevice`
  (la relecture 1 s après un « on » écrasait un dim envoyé juste avant/après, fenêtre 500 ms).
  → Mis à jour (correctif additif, lampes qui reviennent à l'ancienne luminosité).
- `zigbee-clusters` 2.6.0 (nous) vs 3.8.0 (dernier, Node ≥ 22) : ajoute `thermostatUserInterfaceConfiguration`.
  Montée majeure non faite ici (à tester à part).

## 4. Captures Zigbee
Aucun fichier de capture (pcap/pcapng/sniff) sur la box ni dans `/workspace/pc-harvest` → rien à décoder.

## Outils ajoutés
- `scripts/validate/manifest-processor-audit.js <app.json>` : audit non bloquant du manifeste construit
  (ids de flow dupliqués, args inconnus, titres, images, noms, plages / fichiers / tailles OTA). `RAW=1` pour la liste brute.

Crédit : REA © morluto, MIT. Doc Athom : apps.developer.homey.app/wireless/zigbee/zigbee-firmware-updates.
