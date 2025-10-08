# Guide d'Intégration Tuya Zigbee

Ce guide explique comment utiliser le système d'intégration pour le projet Tuya Zigbee.

## Prérequis

- Node.js 14+ installé
- npm ou yarn
- Git (optionnel, pour l'intégration avec le contrôle de version)

## Installation

1. Clonez le dépôt :
   ```bash
   git clone https://github.com/dlnraja/com.tuya.zigbee.git
   cd com.tuya.zigbee
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

## Utilisation

### Lancer l'intégration complète

```bash
node scripts/integrate.js
```

Ce script va :
1. Vérifier et installer les dépendances manquantes
2. Analyser tous les drivers
3. Générer la documentation
4. Vérifier le statut Git et proposer de commiter les changements

### Options disponibles

- `--no-git` : Désactive la vérification Git
- `--force` : Force la régénération de tous les fichiers

## Structure des dossiers

- `/docs/generated` : Documentation générée
- `/reports` : Rapports d'analyse avec horodatage
- `/drivers` : Dossiers des drivers

## Personnalisation

Vous pouvez personnaliser le comportement en modifiant la configuration dans `scripts/integrate.js`.

## Intégration CI/CD

Pour intégrer ce script dans votre pipeline CI/CD, ajoutez cette étape :

```yaml
- name: Run Integration
  run: node scripts/integrate.js --no-git
```

## Dépannage

### Erreur de dépendances manquantes

Si vous rencontrez des erreurs de dépendances manquantes, exécutez :

```bash
npm install --save-dev canvas fs-extra
```

### Problèmes de permissions

Sur Linux/macOS, assurez-vous que les scripts sont exécutables :

```bash
chmod +x scripts/*.js
```
