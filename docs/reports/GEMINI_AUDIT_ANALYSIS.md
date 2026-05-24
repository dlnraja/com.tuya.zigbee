# Analyse Technique et Architectural : Écosystème Universal Tuya Zigbee
## Rapport généré par Gemini AI - 20 Avril 2026

## Cadre Architectural et Gouvernance du Projet

L'application Universal Tuya Zigbee est structurée sur les fondations du **SDK 3 d'Athom**, imposant une conformité stricte avec les standards modernes de Node.js, notamment pour la gestion de la mémoire et les cycles de vie des pilotes. Le projet se distingue par sa volonté de centraliser le support de milliers d'identifiants de fabricants (fingerprints) au sein d'une architecture modulaire capable de gérer à la fois les clusters Zigbee standards (ZCL) et le cluster propriétaire Tuya **0xEF00**.

---

## Structure logicielle et dépendances fondamentales

| Dépendance | Rôle Technique | Version Requise |
|------------|---------------|-----------------|
| homey-zigbeedriver | Couche d'abstraction fondamentale | ^2.2.2 |
| zigbee-clusters | Définition des clusters ZCL pour le parsing | ^2.6.0 |
| tuyapi | Communication locale pour modules hybrides | ^7.7.1 |
| color-space | Conversion colorimétrique (XY, RGB, HSL) | 1.15.0 |
| qrcode | Génération de codes pour appairage | ^1.5.4 |
| punycode | Codage des caractères internationaux | ^2.3.1 |

---

## Règles, Limites et Contraintes du Projet

### Règles de nommage et de structure

1. **Noms de pilotes** : Exclusivement en anglais, sans parenthèses ni caractères spéciaux
2. **Identifiants** : Doivent inclure source d'alimentation (_battery, _ac) et nombre de voies (_1gang, _2gang)
3. **Validation** : Chaque version doit être testée contre le niveau de débogage avant soumission au canal test

### Limites systémiques et physiques

- **Taille archive** : 62 Mo (4028 fichiers) dans v7.4.5
- **Timeout CLI** : Erreurs après 300000ms sur réseaux instables
- **Sessions appairage** : Règle d'or : 60s minimum après inclusion

---

## Audit Chronologique des Problèmes Utilisateurs

### Phase initiale et requêtes de périphériques (Mars 2026)

| Utilisateur | Périphérique | Problème | Statut |
|-------------|--------------|----------|--------|
| Olivier VE | HOBEIAN ZG-302Z3 (3-gang) | 1 seul bouton reconnu | À corriger |
| Lasse K | Capteur de contact | "sans fonction" post-appairage | À corriger |
| Finn Kjetil Viken | IR TS1201 | Clusters DP 0xEF00 non implémentés | À corriger |

### Crise version 7 (Avril 2026)

| Utilisateur | Périphérique | Erreur | Log ID |
|-------------|--------------|--------|--------|
| Cristiano Isaac | Plusieurs pilotes | "Invalid Flow Card ID: curtain_open_partial" | Docker logs |
| Peter van Werkhoven | Tous | Icônes "petits carrés vides" (SVG corruption) | - |
| Sem | TS0601 / _TZE204_clrdrnya | Échec appairage, clusters sortie absents | Interview log |

### Problèmes de configuration et d'interface

| Utilisateur | Périphérique | Symptôme | Log ID |
|-------------|--------------|----------|--------|
| Mikko | Capteur climat TZ3000_tsgqxdb4 | Arrêt mesures, "inconnu" | - |
| Victor B. | BSEED 1-Gang | "Unable to connect" | - |
| Rik van Westerveld | Divers commutateurs | "Missing Capability Listener: onoff" | - |
| Frank | Remote 2-Gang | "Could not get device by ID" | d502faa5 |
| Joep Vullings | Vanne Insoma | Zigbee générique, pas de contrôle | - |

---

## Analyse Technique des Logs de Crash et de Diagnostic

### Erreurs d'initialisation des pilotes

**ID:** 9828603d-1b52-45cf-beac-4c290e52d6d1 (14 Avril 2026)
- **Cause**: Tentative d'enregistrement de `siren_set_volume`, `siren_set_duration` avant initialisation des variables
- **Type**: Temporal Dead Zone error
- **Impact**: Crash de l'application au démarrage, tous périphériques affectés

### Échecs de liaison (Binding) et terminaison (Endpoints)

- **Erreur**: `bind error endpointId=1 clusterId=1: Unexpected Bind Response (status: zdoInvalidEndpoint)`
- **Cause**: Configuration batterie imposée sur endpoints inexistants
- **Impact**: Triangle rouge d'exclamation sur l'interface

### Problèmes Cluster IAS Zone

| Versions | Comportement | Impact |
|----------|--------------|--------|
| 2.15.87-91 | Enrôlement IAS Zone totalement rompu | Périphériques silencieux |
| 2.15.130 | Correctif avec zoneId: 10 | Perdu dans refactorisation v7 |
| v7.x | Boutons SOS (Nedis ZBPB10BK) silencieux | Aucun flux déclenché |

---

## Revue des Pull Requests et Issues GitHub

### Issues critiques résolues

| Issue | Périphérique | Logs impliqués | Version fix |
|-------|--------------|---------------|-------------|
| #198 | Sonoff SNZB-01M | 40491ffe, 343376fb | 7.2.12 |

### PR majeures

1. **Nettoyage doublons** : Suppression 103 identifiants en double
2. **Nouveaux modèles** : Fingerbots, LED RGB _TZ3210_f8dqbuze
3. **Soil Testers** : _TZE284_oitavov2 avec conductivité séparée

---

## Synthèse des Défaillances par Catégorie

| Catégorie | Modèles | Défaillance | Cause Probable |
|-----------|---------|------------|----------------|
| Capteurs mouvement | ZG-204ZM, HOBEIAN | Pas détection | Échec IAS Zone |
| Boutons SOS/Scènes | Nedis TS0215A, Loratap | Aucune action | Conflit cluster 0xEF00 |
| Rideaux/Vannes | Hybrides, Insoma | Inversion commandes | Bits direction inversés |
| Prises mesure | Blitzwolf SHP13, TS011F | Énergie à 0 | electricalMeasurement non lié |
| Capteurs Sol | ZG-303Z, _TZE284_oitavov2 | "Inconnu" | Erreur algo reconnaissance |

---

## Recommandations pour Evolution (v7.x)

### Priorité 1 : Refactorisation Moteur Multi-Mode
- Isoler le moteur UDP/mDNS pour éviter blocage pilotes Zigbee

### Priorité 2 : Optimisation Assets
- Compression images pour éviter timeout CLI 300s
- Réduction au-delà des 62 Mo actuels

### Priorité 3 : Standardisation IAS Zone
- Adopter méthode officielle (Philips Hue, Aqara)
- onZoneEnrollRequest doit renvoyer succès systématique

### Priorité 4 : Débogage Flow Cards
- Vérifier qu'aucun `registerRunListener` n'est appelé sur undefined

### Priorité 5 : Parité Versions
- Synchroniser GitHub → canal test Homey sans régression

---

## Métriques Actuelles du Projet

| Métrique | Valeur |
|----------|--------|
| Drivers | 323 |
| Collisions ID | 469 |
| Scripts automation | 3 (detect, fix, normalize) |
| Variants ajoutés | 2323 |
| Workflows CI/CD | 4+ |

---

*Rapport généré via analyse Gemini AI basée sur forum Homey, GitHub, et logs de diagnostic*