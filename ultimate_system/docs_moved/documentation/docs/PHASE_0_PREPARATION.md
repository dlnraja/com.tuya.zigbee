# Phase 0 - Préparation & Cadrage (0-20)

## Objectif
Mettre en place la structure de base du projet et collecter toutes les références nécessaires.

## Étape 0-20 : Initialisation du Projet

### 0. Clonage du dépôt
```bash
git clone https://github.com/dlnraja/com.tuya.zigbee.git
cd com.tuya.zigbee
```

### 1. Création d'une nouvelle branche
```bash
git checkout -b refactor/500-steps-rebuild
```

### 2. Nettoyage initial
```bash
# Suppression des fichiers inutiles
rm -rf node_modules/
rm -rf .homeybuild/
rm -rf .homeyignore
rm -f package-lock.json
```

### 3. Initialisation du projet
```bash
npm init -y
npm install homey-zigbeedriver homey-apps-sdk-v3 --save
```

### 4. Configuration des outils
Création du fichier `.editorconfig` :
```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_size = 2
indent_style = space
insert_final_newline = true
trim_trailing_whitespace = true
```

### 5. Configuration d'ESLint
Fichier `.eslintrc.json` :
```json
{
  "extends": ["homey-app"],
  "rules": {
    "no-console": "warn",
    "prefer-const": "error"
  }
}
```

### 6. Configuration TypeScript
Fichier `tsconfig.json` :
```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", ".homey*"]
}
```

### 7. Fichier .gitignore
```
# Dependencies
node_modules/

# Build files
dist/
build/

# Environment variables
.env
.env.*
!.env.example

# IDE
.idea/
.vscode/
*.swp
*.swo

# Homey
.homey*
*.homey*

# Logs
logs
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db
```

### 8. Configuration de base du package.json
```json
{
  "name": "com.tuya.zigbee",
  "version": "1.0.0",
  "description": "Pilote universel pour appareils Tuya Zigbee",
  "main": "app.js",
  "scripts": {
    "start": "homey app run",
    "build": "homey app build",
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx",
    "test": "jest",
    "validate": "homey app validate"
  },
  "keywords": ["tuya", "zigbee", "homey"],
  "author": "DLN Raja",
  "license": "MIT",
  "dependencies": {
    "homey": "^3.0.0",
    "homey-zigbeedriver": "^1.0.0"
  },
  "devDependencies": {
    "@types/jest": "^27.0.0",
    "eslint": "^8.0.0",
    "eslint-config-athom": "^3.0.0",
    "jest": "^27.0.0",
    "typescript": "^4.0.0"
  },
  "homey": {
    "minAPIVersion": "3.0.0"
  }
}
```

### 9. Structure des dossiers
```bash
mkdir -p src/drivers src/lib test/unit test/integration
touch src/app.js src/app.json
```

### 10. Fichier app.json de base
```json
{
  "id": "com.tuya.zigbee",
  "sdk": 3,
  "name": {
    "en": "Tuya Zigbee",
    "fr": "Tuya Zigbee"
  },
  "version": "1.0.0",
  "compatibility": ">=5.0.0",
  "author": {
    "name": "DLN Raja",
    "email": "contact@example.com"
  },
  "category": [
    "appliances"
  ],
  "permissions": [
    "homey:wireless:zigbee"
  ],
  "images": {
    "large": "/assets/images/large.png",
    "small": "/assets/images/small.png"
  },
  "platforms": [
    "local"
  ]
}
```

### 11. Fichier README.md initial
```markdown
# Tuya Zigbee Driver

Pilote universel pour les appareils Tuya Zigbee sur Homey.

## Fonctionnalités
- Support de nombreux appareils Tuya Zigbee
- Détection automatique des appareils
- Interface utilisateur intuitive

## Installation
1. Allez dans l'onglet "Apps" de l'application Homey
2. Recherchez "Tuya Zigbee"
3. Cliquez sur "Installer"

## Développement
```bash
# Installation des dépendances
npm install

# Lancer en mode développement
npm start
```

## Licence
MIT
```

### 12. Configuration de Git
```bash
git config --local user.name "DLN Raja"
git config --local user.email "contact@example.com"
git config --local commit.template .gitmessage
```

### 13. Fichier .gitmessage
```
# <type>(<scope>): <subject>
# <BLANK LINE>
# <body>
# <BLANK LINE>
# <footer>

# Types:
#   feat:     Nouvelle fonctionnalité
#   fix:      Correction de bug
#   docs:     Documentation
#   style:    Formatage, point-virgule manquant...
#   refactor: Refactoring du code
#   test:     Ajout de tests
#   chore:    Mise à jour des tâches de build, configuration

# Exemple:
# feat(drivers): ajout du support pour l'interrupteur Tuya
#
# Description détaillée si nécessaire
#
# Fixes #123
```

### 14. Configuration de Prettier
Fichier `.prettierrc` :
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

### 15. Configuration de Jest
Fichier `jest.config.js` :
```javascript
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!**/node_modules/**',
    '!**/test/**'
  ]
};
```

### 16. Configuration de Husky pour les hooks Git
Fichier `.husky/pre-commit` :
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Exécuter le linter
npm run lint

# Exécuter les tests
npm test
```

### 17. Configuration des scripts NPM
Mise à jour du `package.json` :
```json
{
  "scripts": {
    "prepare": "husky install",
    "precommit": "lint-staged",
    "commit": "git-cz"
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ]
  }
}
```

### 18. Installation des dépendances de développement
```bash
npm install --save-dev husky lint-staged @commitlint/cli @commitlint/config-conventional
```

### 19. Configuration de Commitlint
Fichier `.commitlintrc.json` :
```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert"
      ]
    ]
  }
}
```

### 20. Vérification finale
```bash
# Vérifier la configuration
npm run lint
npm test

# Faire un premier commit
git add .
git commit -m "chore: initial project setup"

# Pousser les changements
git push -u origin refactor/500-steps-rebuild
```

## Phase 0 Terminée !
La configuration de base du projet est maintenant terminée. Vous êtes prêt à commencer le développement des fonctionnalités principales dans la Phase 1.
