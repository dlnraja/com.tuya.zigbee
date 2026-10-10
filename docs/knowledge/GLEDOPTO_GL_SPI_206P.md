# Gledopto GL-SPI-206P — recherche (10/10/2026)
Driver : drivers/led_controller_spi_tuya (master 6255ae0148). Absent de stable (qui passe chez Athom).

## Sources
- Koenkk/zigbee-herdsman-converters src/devices/gledopto.ts (Koen Kanters et contributeurs) — définition GL-SPI-206P, tzLocal.glspi206p_light ; Z2M issue #32754.
- https://apps.developer.homey.app/the-basics/devices/capabilities (Athom) — capabilitiesOptions, uiState (>=13.5.0), setOnDim, duration, composant color.
- https://apps.developer.homey.app/app-store/publishing (Athom) — validate publish/verified.
- Non vérifiés : ZHA quirks, deCONZ, Hubitat, SmartThings, app Gledopto Athom, app de Johan.

## Référence Z2M
- Empreintes TS0601 : _TZE204_8fffc3kb, _TZE284_gt5al3bl, _TZE28C1000000_gt5al3bl (manquant chez nous).
- DP1 état, DP2 mode (0 blanc/1 couleur/2 scène/3 musique), DP3 lum. 10-1000, DP4 temp. 0-1000 (0=chaud, mireds 370..153), DP61 couleur.
- DP61 = 00 01 01 14 00 | hue u16BE %360 | sat*10 u16BE | luminosité DP3 u16BE.
- Tout en UNE trame multi-DP (rafales = gel du MCU, #32754).
- Extras : 16 scènes, 6 modes musique + sensibilité, countdown, do_not_disturb, ordre perles (18), chip_type (10), pixels 10-1000.

## Problèmes du driver
1. DP61 v=1000 en dur : changer la couleur remet la luminosité à 100 %.
2. hue peut valoir 360 (pas de %360).
3. 3 envois séparés (DP1, DP2, DP61) : risque de gel.
4. Pas de light_temperature/light_mode (DP4) alors que RGBCCT.
5. Empreinte _TZE28C1000000_gt5al3bl absente.
6. Pas d'image xlarge (aucun des 448 drivers n'en a -> pas la cause). small 75x75 / large 500x500 PNG valides.
7. Champ "metadata" non standard (présent dans 96 drivers -> pas propre à master).
8. Trigger flow brightness_changed jamais déclenché ; titleFormatted contient "{brightness}" (token, pas [[arg]]).
9. Couples partagés avec switch_1gang (exception validée) = doublon inter-drivers.

## Suspects AggregateError (ce driver)
a) carte flow morte / titleFormatted ; b) doublon de couples avec switch_1gang ; c) learnmode icon.svg. Rien d'invalide évident côté platforms/connectivity/images. Test : retirer le driver (bisect en cours), puis le réintroduire sans la carte flow.

## Propositions additives
Trame unique, v = luminosité courante, hue %360 ; light_temperature + light_mode ; onoff.setOnDim ; empreinte _TZE28C ; réglages chip_type/ordre/pixels ; actions scène/musique.

## Autres sources (lues le 10/10/2026)
- **ZHA** : pas de quirk officiel dans zigpy/zha-device-handlers. Quirk communautaire WOOWTECH/Woow_ha_zha_quirk_component (`ts0601_light_TZE284_gt5al3bl.py`, WOOWTECH) : expose une seule lumière HS + température + effets ; **44 scènes** natives (DP51, relevées depuis l'app Smart Life, les 16 de Z2M en sont un sous-ensemble) ; l'allumage (DP1) doit partir AVANT DP2=scène + DP51 ; les rapports entrants des DP 1/2/3/4/51/61 doivent être routés à la main.
- **SmartThings** : wonjj6768/smartthings-zigbee-edge-drivers (`wave15_gledopto.lua`) : **DP61 est en écriture seule** (une demande d'état le renvoie sans valeur) → mémoriser teinte/saturation localement et publier l'état de façon optimiste ; **DP4 n'est appliqué qu'en mode blanc** → envoyer DP2=0 avant DP4.
- **Autres hubs** : homed-service-zigbee (u236, `ts0601.json`), Z2S_Library (lsroka76, ESP32 Zigbee) et zhac-docs listent les deux couples avec la même grille de DP.
- **deCONZ, Hubitat** : rien trouvé pour ce modèle (recherche de code GitHub).
- **App Gledopto Homey** (motor4all/com.gledopto, dernier commit 2018) : 3 drivers ZLL classiques (rgb, ww, wwcw), aucun SPI/TS0601.
- **App de Johan** (JohanBendz/com.tuya.zigbee) : drivers rgb_led_strip/_controller génériques, aucun des deux couples.

## Ajouts aux propositions
- Mémoriser hue/sat et mettre à jour les capabilities sans attendre de retour (DP61 muet).
- DP2=0 avant DP4 pour la température ; DP1 avant les scènes.
- Scènes via DP51 (16 de Z2M, 44 possibles) en action de flow.
