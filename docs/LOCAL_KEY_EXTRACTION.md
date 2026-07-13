# Guide: Extraction de la Local Key Tuya (Mode Hors-Ligne)

Suite aux nombreuses révocations de l'API Tuya IoT Core (erreurs de quota, erreur *No matching app user information*), l'application Universal Tuya utilise par défaut des connexions locales sécurisées (Local-Tuya) pour les périphériques Wi-Fi.

Cependant, vous DEVEZ fournir la **Local Key** de chaque appareil pour permettre son déchiffrement local sans passer par le Cloud. 

## Méthode Rapide (Application Android Modifiée)

1. **Simulateur Android** : Téléchargez et installez [BlueStacks](https://www.bluestacks.com/) sur votre PC/Mac.
2. **Versions Anciennes** : Installez l'ancienne application Android SmartLife **v3.6.1** ou Tuya Smart **v3.6.1** via un fichier APK. *(Les versions plus récentes offusquent les clés et empêchent l'extraction).*
3. **Appairage Centralisé** : Connectez-vous à votre compte Tuya sur l'application. Attendez que tous vos appareils Wi-Fi finissent de se charger sur la vue d'ensemble.
4. **Acquisition Sécurisée** : L'application Android aura sauvegardé les Local Keys issues du Cloud sur le stockage du simulateur BlueStacks.
5. **Exploration Fichier** : À l'aide d'un explorateur Root pour Android (comme Root Explorer), naviguez jusqu'au fichier :
   `/data/data/com.tuya.smartlife/shared_prefs/preferences_global_key.xml` (ou chemin similaire)
6. **Lecture** : Dans ce fichier texte, cherchez la chaîne `<string name="localKey">`. Vous y trouverez la liste de chaque clé locale hachée (AES). La clé compte 16 caractères de long.

Notez chaque Local Key dans Homey lors de l'appairage.

## Rétro-Compatibilité

Vos périphériques Zigbee **N'y sont pas assujettis**. Ce guide est réservé uniquement aux appareils Tuya Wi-Fi refusant de s'enregistrer nativement via votre coordinateur principal ou en cas de crash intempestif liés au cloud VCF 502.
