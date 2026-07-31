# P92.70 — Homey 2026 : OTA Zigbee natif + écosystème (Matter, HP2026, Bridges)

> 2026-07-31. Implémentation des nouveautés Homey 2026 dans l'app.

## 1. OTA Zigbee natif (firmware Homey v13.2.0+) — IMPLÉMENTÉ

Homey flashe désormais les appareils Zigbee **nativement** (cluster OTA Upgrade),
quand l'app embarque les images via `driver.firmwareUpdates` (fichier compose
`drivers/<id>/driver.firmware.compose.json`, fusionné par CLI ≥ 4.x, validé par
homey-lib ≥ 2.51 — les deux ont été **upgradés dans le repo** : homey 4.4.1, homey-lib 2.51.4).

Format exact (vérifié dans le validateur officiel `homey-lib/lib/App/index.js` + schéma) :

- `files[].name` : **basename uniquement** (aucun sous-dossier) ; le fichier vit dans
  `drivers/<id>/assets/firmware/<name>` (`Util.getOTAFilePath`).
- `files[].integrity` : `"sha256:<hex>"` — **vérifié réellement** par homey-lib à la validation.
- Header OTA (`0x0BEEF11E`) : `manufacturerCode`/`fileVersion`/`imageType` **revérifiés**
  contre le fichier par homey-lib.
- `device.manufacturerName`/`productId` : **sous-ensembles stricts** des listes zigbee du driver.
- `updates` : ≥ 1 entrée, `changelog` obligatoire (string ou `{en}`).

### Ce qui est livré

- `tools/ci/build-firmware-updates.js` — générateur autonome (branché dans
  `self-improve.yml`, hebdo) : scanne l'index Koenkk/zigbee-OTA, ne retient que les images
  **OEM Tuya** (codes 4417/4098) correspondant à nos empreintes curées (mfs_db),
  **exclut les firmwares communautaires pvvx** (fileVersion 20459521 — ce sont des
  remplacements, pas des mises à jour constructeur), télécharge avec **vérif SHA512**
  (durcissement déjà en place), valide le header, calcule le sha256.
- **6 drivers équipés** (images OEM réelles, ~1,5 Mo total) :
  `radiator_valve` (si32 TRV v87), `thermostatic_radiator_valve` (même module, `_TZE200_ckud7u2l`),
  `curtain_motor_shutter` (MG21 cover relay v71), `switch_1gang` (TL8258 breaker v74),
  `button_wireless_2` (TL8258 plug v82), `usb_dongle_triple` (TL8258 plug v78).
- 2 placeholders historiques invalides (`plug`, `rain_sensor`, `files: []`) **supprimés** —
  aucune image n'existe pour ces appareils (vérifié dans tout l'index) : promesse non
  livrable = pas d'entrée. Le générateur les ajoutera automatiquement si des images paraissent.

Réalité (documentée dans le rapport OTA) : seules ~37 images Tuya existent au total dans
Koenkk (dont ~7 utiles pour nous) — les appareils TS0601 MCU n'ont **aucune** image publique ;
pour eux la voie reste « détecter + notifier + guider » (déjà en place).

## 2. Matter Bridge (firmware v13.3.0, Homey certifié Matter 1.5)

Rien à coder : Homey **traduit** automatiquement les appareils Zigbee en appareils Matter
(Apple Home, Google Home, Alexa, SmartThings, HA). Notre travail de fond (capabilities
système démasquées P92.68, classes correctes, conventions) améliore directement la
qualité du mapping Matter.

## 3. Homey Pro (2026) — 4 Go RAM

Mêmes radios que 2023 ; support jusqu'en juin 2031. Nos mitigations restent pertinentes
(jitter boot, init différée, pas de tempête ZDO) — la RAM supplémentaire aide les gros
réseaux mais ne change pas le protocole.

## 4. Homey Bridge / Satellite Mode / Self-Hosted Server

Côté plateforme, rien côté app. Le Bridge agit en **routeur** Zigbee (extension de maillage).

## 5. Points de vigilance surveillés

- **Stack Zigbee 1.0 côté Homey** (pas de réécriture majeure) ; Zigbee 3.0 reste compatible.
- **Bug remonté « attribute ID 0x0000 non supporté »** : non reproduit chez nous — nos
  listeners passent par les **noms** d'attributs définis (`attr.onOff` = id 0x0000 dans
  zigbee-clusters `onOff.js:7`) et fonctionnent en production (BSEED confirmé #1395).
- **Limite pratique ~30-40 appareils** : nos gardes anti-tempête (jitter, debounce,
  anti-spam TX) sont la bonne réponse côté app.

## Tests

`test/firmware-updates.test.js` — format, intégrité, exclusions pvvx, sous-ensembles
device ⊆ driver, outil présent dans self-improve.
