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

## Generic Thank You / Update Announcement

```
Merci pour votre retour ! 🧡

✅ Universal TUYA Zigbee + WiFi est en développement actif (v8.5.0).
📌 150+ drivers, 6,000+ fingerprints
📌 100% local, sans cloud, Privacy-First
📌 Phoenix Sovereign Architecture (v8.5.0) — Sécurité renforcée, L14 Hardened Telemetry
📌 Tuya WiFi local (expérimental)

Vos retours nous aident à améliorer le support ! 🚀
```

---

## Security/Leak Report

```
Merci d'avoir signalé ce problème de sécurité ! 🔒

✅ L'équipe a pris les mesures suivantes:
1. Token révoqué immédiatement
2. Audit de répertoire complet effectué
3. .gitignore renforcé avec entrées .env, credentials.json, *.key
4. Workflow CI v8.5.0 avec job Security Shield automatisé

Si vous découvrez d'autres vulnérabilités, merci de nous contacter directement.
```

---

## Dual-App Guidance (master vs stable-v5)

```
📢 Deux versions coexistent :

🔬 **master (v9.x)** — Preview / soak (features OK)
   - Nouvelles features, couches protocole, télémetrie
   - ID App: `com.dlnraja.tuya.zigbee` (Homey Test)

✅ **stable-v5 (v5.12.x)** — Reliability LTS
   - Fiabilité only (pas de feature managers)
   - **Même** Homey App ID `com.dlnraja.tuya.zigbee` — Publish Stable→Test
     écrase le slot Test de master. Prefer Live pour stable; Test = soak master.

Choisissez master Test pour les nouveautés, stable Live pour la prod prudente.
```

---

## Deploy Failure / Homey Mail

```
Bonjour, nous avons reçu votre notification de déploiement Homey. 🛠️

✅ Notre pipeline CI/CD v8.5.0 a été renforcé :
- Timeouts augmentés (15min validate, 20min build)
- Job Security Shield ajouté
- Gate PRE_COMMIT_CHECKS.js renforcé
- Syntax checking 100% avant push

Les déploiements futurs devraient passer sans problème. Merci de votre patience !
```

---

## Dual Release Guard Explanation

```
ℹ️ Note technique : master et stable-v5 ont des BUTS différents (features vs fiabilité).

- master : v9.x preview — Auto-Publish → Homey Test
- stable-v5 : v5.12.x LTS — reliability only; backport chirurgical (BOTH), jamais full-tree copy

⚠️ Même App ID Homey `com.dlnraja.tuya.zigbee` : ne pas publier stable sur Test
pendant un soak master (sinon écrasement). Il n'existe pas de store ID
`com.dlnraja.tuya.zigbee.stable` live.