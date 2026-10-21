# Couche clusters ZCL (P2931, 2026-10-21)

Module : `lib/zigbee/cluster/` (accès paresseux via `index.js`). Tests : `test/zcl-cluster-layer.test.js`.

## Manques trouvés
1. **Double enregistrement 0xEF00** : `Cluster.addCluster()` de zigbee-clusters 2.6 écrase par ID et par NAME (« le dernier gagne »). 26 drivers enregistrent au chargement l'ancienne classe `lib/TuyaSpecificCluster.js` (11 commandes) par-dessus la canonique `lib/clusters/TuyaSpecificCluster.js` (20 commandes : mcuSyncTime, sceneWakeup, dpStatusUpdate, 0x0B–0x0F…). Selon l'ordre de chargement, la synchro d'heure et le réveil de scène disparaissaient.
2. La canonique `onMcuSyncTime` appelle `this.timeSync()`; les écouteurs de l'événement legacy `timeSync` n'étaient plus servis avec la canonique.
3. `pollControl` (pas de `checkIn`/`checkInResponse`) et `ota` (aucune commande client) sont incomplets dans zigbee-clusters 2.6.
4. Aucun BoundCluster pour colorControl, windowCovering, groups, pollControl, ota, time ; une commande inconnue est rejetée (`unknown_command_received`) sans être capturée.
5. Pas de planificateur de liaisons borné, ni de repli « polling » borné quand configureReporting échoue, ni de décodeur de trames brutes indépendant du registre.

## Correctifs
- `ClusterRegistry.install()` (appelé en tête de `app.js`) : `addCluster` idempotent, fusion par ID (la classe la plus riche reste la base, les noms manquants sont greffés ; un nom au même id+direction devient un alias d'envoi seulement car zigbee-clusters dispatche le *dernier* doublon). Pas d'ombre sur une vraie méthode de la base. Événement legacy réémis. Greffes standard pollControl/ota. Log borné à 30.
- `RoutedBoundCluster` : fabrique d'un BoundCluster par cluster, chaque commande → `route(evt)` ; inconnue → `{command:'raw'}` routée + acquittée ; `bindAll` n'écrase jamais une liaison existante.
- `ZclCodec` : en-tête ZCL (code fabricant), commandes globales 0x01/0x04/0x07/0x0A/0x0B/0x0D, types enum8, bitmap8–64, int24/uint24, semi/single/double, chaînes courtes/longues, array/set/bag, struct ; profondeur ≤ 3, ≤ 64 éléments, ne lève jamais. `buildDefaultResponse`.
- `BindingPlanner` : liaisons de tous les clusters clients sur chaque endpoint, ≤ 3 essais par couple, cooldown 10 min, relance au réveil, budget 24 par appareil (pas de tempête).
- `ReportingPlan` : valeurs par capacité ; repli polling ≤ 4 attributs, ≥ 5 min, timers `unref`, arrêtés dès qu'un rapport arrive.
- `AttributeIO` : timeout + relance + bascule avec/sans code fabricant + lecture attribut par attribut.
- `EndpointAdapter` : écart driver ↔ descripteur réel, plan additif uniquement (ep 242 GP ignoré).

## Sources (réécrites)
zigbee-clusters (Cluster/BoundCluster/Endpoint) et doc SDK Athom ; spec ZCL 07-5123 ; zigbee-herdsman (types, presets de reporting) ; ZHA/zigpy quirks (repli code fabricant, liaison au réveil) ; deCONZ ; app de Johan (un BoundCluster par cluster) ; Z2M #26078 (séquence mcuSyncTime).

## Reste à faire
Brancher `RoutedBoundCluster.bindAll`, `BindingPlanner` et `ReportingPlan` dans les classes de base (aujourd'hui bibliothèque opt-in), après observation de la fusion du registre sur un vrai appareil.

## P2935 — branchement (2026-10-21)
- `lib/zigbee/cluster/ClusterLayerAttach.js`, appelé APRÈS l'init native : (a) bloc différé de `TuyaZigbeeDevice.onNodeInit`, (b) enveloppe posée dans le constructeur de `TuyaZigbeeDevice` pour les bases qui n'appellent pas `super.onNodeInit` (BaseUnifiedDevice, TuyaUnifiedDevice…) : 15–20 s après leur init. Idempotent (`device._p2935`).
- Couches, chacune en try/catch : capture BoundCluster (onOff, levelControl, scenes, colorControl, windowCovering, groups, iasACE ; jamais par-dessus une liaison du driver ; appuis seulement pour télécommandes pures / mode scène / relais découplé), liaisons bornées d'après le vrai descripteur (rien si absent), relève de secours du reporting via `homey.setInterval`, réveil (pollControl checkIn, rejoin, toute trame, ≤ 1 / 30 min), observateur OTA passif.
- OTA : `OTAUpdateManager.noteClientRequest()` / `getClientReport()` enregistrent la vraie version, le type d'image, le code fabricant, l'offset et le statut de fin (≤ 200 appareils, historique ≤ 50). Ne répond jamais à l'appareil.
- `scenes` n'a aucune commande dans zigbee-clusters 2.6 : `ScenesBoundCluster.recall()` ne pouvait jamais être appelé. Greffe view/remove/store/recall.
- Interrupteurs : réglage appareil `zcl_cluster_layer` (template `.homeycompose/drivers/settings/zclClusterLayer.json`, activé par défaut, 382 drivers) ; drapeau app `zcl_cluster_layer_disabled` (ManagerSettings) = true pour tout couper.
- Non couverts : 13 drivers au JSON non canonique (réglage absent = activé), et les drivers qui étendent `ZigBeeDevice` directement.
