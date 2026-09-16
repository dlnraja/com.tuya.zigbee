# Journal du Net — Zigbee (harvest notes)

Source: https://www.journaldunet.com/web-tech/dictionnaire-de-l-iot/1440710-zigbee-quel-est-ce-protocole-pour-les-produits-domotiques/  
Date article: 2023-04-13 · Author: Célia Garcia-Montero  
Harvest: 2026-09-16 · silent enrich only

## Points retenus

- Protocole sans fil maison connectée (2004), **réseau maillé**.
- Faible consommation ; rôle = communiquer **sans Wi-Fi** pour les objets.
- Portée indoor typique **10–20 m** ; mesh étend la couverture.
- Vs Z-Wave : Zigbee portée plus courte, **2,4 GHz** (EU) vs Z-Wave **868 MHz** ; débit Zigbee ~**250 kbit/s** vs Z-Wave ~**100 kbit/s**.
- Zigbee2MQTT : passerelle DIY / sniffer (contexte HA — pas Homey runtime).
- CSA (ex Zigbee Alliance) ; chemin Matter ; Zigbee PRO 2023 (sécurité + bandes 800/900 MHz annoncées).

## Mapping projet

→ `protocolSelectionBrief()` + `docs/guides/RF_CHANNEL_COEXISTENCE.md` § Protocol roles.  
Pas d’invent de couples mfr+pid. Pas de POST forum.
