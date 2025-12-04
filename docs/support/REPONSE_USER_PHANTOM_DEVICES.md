# 📧 Réponse Utilisateur - Capteur Climatique avec Devices Fantômes

## Message de l'utilisateur
> "Trip de capteur climatique avec point d'exclamation triangle rouge. Alors que j'ai ajouté que 1 seul capteur et toujours pas de température ni même de humidité"

---

## 🔍 Diagnostic

Nous avons analysé votre rapport et identifié le problème :

### Ce qui s'est passé
Votre capteur `_TZE284_vvmbj46n` a été appairé avec une version antérieure de l'app qui avait un bug créant des "sous-appareils" fantômes. Au lieu d'1 appareil, 54 ont été créés !

### État actuel
- **Appareil principal** : `04a3108a-084d-404c-bc63-9d360746628c` (le bon!)
- **Appareils fantômes** : 53 devices avec "subDeviceId" (à supprimer)
- **Batterie** : 100% ✅ (le capteur communique!)
- **Température/Humidité** : En attente (capteur en veille)

---

## ✅ Solution en 3 étapes

### Étape 1 : Supprimer les appareils fantômes
1. Ouvrez l'app Homey
2. Allez dans **Appareils**
3. Supprimez **TOUS** les "Capteur Climatique" qui affichent :
   - ⚠️ "Appareil fantôme (subDevice X)"
   - Un triangle rouge d'avertissement
4. **Gardez uniquement** celui qui fonctionne (batterie 100%)

### Étape 2 : Réveillez le capteur
Les capteurs sur batterie dorment pour économiser l'énergie. Pour forcer un réveil :
1. **Appuyez sur le bouton** du capteur (s'il y en a un)
2. Ou **retirez/remettez les piles** pendant 5 secondes
3. Attendez **2-5 minutes**

### Étape 3 : Vérifiez les données
Après le réveil :
- La température et l'humidité devraient apparaître
- Si toujours rien après 10 minutes, renvoyez un rapport diagnostic

---

## ℹ️ Informations Techniques

| Élément | Valeur |
|---------|--------|
| Modèle | TS0601 |
| Fabricant | _TZE284_vvmbj46n |
| Protocole | Tuya DP (cluster 0xEF00) |
| Type | End Device (batterie) |
| IEEE | a4:c1:38:ac:ed:30:d7:a5 |

---

## 🔧 Ce que nous avons corrigé

Dans la version **v5.3.62**, nous avons :
1. ✅ Bloqué la création de sous-appareils fantômes
2. ✅ Ajouté détection et message d'avertissement
3. ✅ Amélioré la réception Tuya DP

Les nouveaux appairages ne créeront plus de fantômes !

---

## 📞 Si le problème persiste

Après avoir supprimé les fantômes et réveillé le capteur, si vous n'avez toujours pas de données :
1. Supprimez complètement l'appareil
2. Remettez le capteur en mode appairage (voir manuel)
3. Ré-appairez avec la dernière version de l'app

Merci pour votre patience et votre rapport !

---
*Support Universal Tuya Zigbee v5.3.62*
