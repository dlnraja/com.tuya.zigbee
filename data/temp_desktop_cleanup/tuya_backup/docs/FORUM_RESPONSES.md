# Forum Response Templates

## Device Not Supported

```
Merci pour le log ! 🧡

Ton device est un TS0601 / [manufacturerName]. Je l'ai ajouté à la base des devices en attente.

📌 Peux-tu fournir:
1. Les logs complets (Homey Developer Tools)
2. Le type physique (capteur, prise, interrupteur...)
3. Le comportement attendu

Je t'informe dès que le support est ajouté !
```

---

## Wrong Driver Mapping

```
Ce device devrait être mappé comme un [bouton/capteur/switch], pas un [type actuel].

✅ Correction en cours - sera disponible dans la prochaine version.

📌 Après la mise à jour:
1. Supprime l'appareil
2. Reset (5-10s sur le bouton)
3. Re-paire avec la nouvelle version
```

---

## Time Sync Issues

```
Certains firmwares Tuya limitent les fonctions locales (Time Sync).

✅ L'app supporte:
- ZCL Time cluster (0x000A)
- Tuya mcuSyncTime

💡 Si le problème persiste, essaie de re-pairer l'appareil.
```

---

## Generic Thank You

```
Merci pour votre retour ! 🧡

✅ Universal TUYA Zigbee + WiFi est en développement actif (v5.11.x).
📌 138 drivers, 5,579 fingerprints
📌 100% local, sans cloud
📌 WiFi Tuya local (expérimental)

Vos retours nous aident à améliorer le support ! 🚀
```
