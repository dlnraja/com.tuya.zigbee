# Guide d'Automatisation Tuya Zigbee

Ce guide explique comment utiliser les outils d'automatisation pour le projet Tuya Zigbee.

## 📋 Prérequis

- Node.js 18 ou supérieur
- Homey CLI installé globalement (`npm install -g homey`)
- Git installé et configuré
- Accès en écriture au dépôt Git

## 🚀 Installation

1. Cloner le dépôt :
   ```bash
   git clone https://github.com/dlnraja/com.tuya.zigbee.git
   cd com.tuya.zigbee
   git checkout tuya-light
   ```

2. Installer les dépendances :
   ```bash
   npm install
   npm install -g homey
   ```

## 🛠️ Scripts Disponibles

### 1. Orchestrateur Principal (`orchestrate.js`)

Analyse, valide et met à jour les drivers.

```bash
node orchestrate.js
```

**Actions effectuées :**
- Scan des drivers existants
- Validation avec `homey app validate`
- Traduction des textes
- Mise à jour de la version et commit

### 2. Générateur de Drivers (`generate-driver.js`)

Crée un nouveau driver avec la structure de base.

```bash
node generate-driver.js <driver-id> [capability1] [capability2] ...
```

**Exemple :**
```bash
node generate-driver.js my-tuya-device onoff dim
```

### 3. Validation Manuelle

```bash
# Valider l'application
homey app validate --level debug

# Générer les traductions
npx homey translate --force
```

## 🔄 GitHub Actions

Le workflow est configuré pour s'exécuter :
- Tous les lundis à 09:00 UTC
- À chaque push sur la branche `tuya-light`
- Manuellement depuis l'interface GitHub

## 📊 Rapports

Les rapports sont générés dans le dossier `reports/` :
- `integration-report.md` : Résumé de l'analyse
- Fichiers de validation dans `.homeybuild/`

## 🛠️ Dépannage

### Problèmes de Validation
1. Vérifiez les erreurs dans la sortie de `homey app validate`
2. Consultez le rapport d'intégration
3. Vérifiez les logs GitHub Actions

### Problèmes de Traduction
1. Exécutez `npx homey translate --force`
2. Vérifiez les fichiers dans `locales/`

## 📝 Bonnes Pratiques

1. Toujours créer une branche pour les modifications
2. Tester localement avant de pousser
3. Mettre à jour la documentation
4. Suivre les conventions de nommage

## 📞 Support

Pour toute question, ouvrez une issue sur GitHub ou contactez l'équipe de développement.
