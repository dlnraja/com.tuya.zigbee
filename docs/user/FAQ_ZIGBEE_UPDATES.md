# FAQ: Zigbee after Homey 13.5, and Device Updates (OTA)

## My device shows "unavailable" after updating Homey to 13.5

Homey 13.5 moved the Homey Pro Zigbee radio from EmberZNet 7.4.2 to 9.1.0. The new stack
checks delivery end to end (APS ACK) and handles join, rejoin and the Trust Center differently.
Some devices, especially battery "sleepy" ones (LCD sensors, buttons, door sensors), do not
come back by themselves after the update.

Try these steps in order:
1. **Wake the device**: press its button once, open and close the sensor, or take the battery
   out for 10 seconds. A sleepy device only talks to Homey when it wakes up.
2. **Wait about 5 minutes**. Mains-powered routers nearby (plugs, wall switches) rebuild the
   mesh routes first.
3. **Re-pair the device**, only if it is still unavailable. You don't need to delete it first:
   put the device in pairing mode and add it again with the same driver. If it pairs as a new
   device, update the Flows that used the old one, then delete the old device.

When you report the problem, please include a diagnostic report. It contains the
manufacturer name and model id we need.

## Device Updates (Zigbee firmware over the air)

- Homey can install Zigbee firmware since **Homey 13.2.0** with **Homey Mobile 9.10.0** or later.
  On older Homey versions the app still works normally; the update simply isn't offered.
- The app only ships firmware for an exact manufacturerName + productId couple, and only an
  image whose manufacturer code and image type match the device. Today this covers the Tuya
  thermostatic radiator valve (firmware v87, from the Koenkk/zigbee-OTA index).
- Battery devices must be awake to start the update. Follow the wake instruction shown in the app.

---

# FAQ (FR) : Zigbee après Homey 13.5, et Device Updates (OTA)

## Mon appareil est « indisponible » après la mise à jour de Homey en 13.5

Homey 13.5 fait passer la radio Zigbee du Homey Pro d'EmberZNet 7.4.2 à 9.1.0. La nouvelle pile
vérifie la livraison de bout en bout (APS ACK) et gère autrement l'arrivée et le retour des
appareils sur le réseau, ainsi que le Trust Center. Certains appareils, surtout ceux sur pile
(capteurs LCD, boutons, détecteurs d'ouverture), ne reviennent pas seuls après la mise à jour.

Dans l'ordre :
1. **Réveillez l'appareil** : appuyez une fois sur son bouton, ouvrez et refermez le capteur,
   ou retirez la pile 10 secondes.
2. **Attendez environ 5 minutes**, le temps que les routeurs secteur proches (prises, interrupteurs)
   reconstruisent le maillage.
3. **Ré-appairez** l'appareil s'il reste indisponible. Il n'est pas nécessaire de le supprimer
   d'abord : passez-le en mode appairage et ajoutez-le de nouveau avec le même driver. S'il
   apparaît comme un nouvel appareil, mettez à jour les Flows qui utilisaient l'ancien, puis
   supprimez l'ancien.

## Device Updates (mise à jour du firmware Zigbee)

- Disponible depuis **Homey 13.2.0** avec **Homey Mobile 9.10.0** ou plus récent. Sur une version
  plus ancienne, l'app fonctionne normalement ; la mise à jour n'est simplement pas proposée.
- L'app ne fournit un firmware que pour un couple manufacturerName + productId exact, avec un
  code fabricant et un type d'image qui correspondent à l'appareil.
- Les appareils sur pile doivent être réveillés pour démarrer la mise à jour.
