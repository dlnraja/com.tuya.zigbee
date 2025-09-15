# 📁 Structure du Projet com.tuya.zigbee

## 📂 Structure des Dossiers

```
com.tuya.zigbee/
├── .github/                    # Configuration GitHub (CI/CD, templates d'issues, etc.)
├── dist/                       # Fichiers compilés (généré)
├── docs/                       # Documentation du projet
│   ├── DEV_GUIDE.md           # Guide du développeur
│   ├── DEVICE_SUPPORT.md      # Liste des appareils supportés
│   └── API_REFERENCE.md       # Documentation de l'API
├── drivers/                   # Pilotes d'appareils
│   ├── common/                # Code partagé entre les pilotes
│   │   ├── capabilities/      # Définitions des capacités
│   │   └── clusters/          # Implémentations des clusters Zigbee
│   ├── categories/            # Catégories de pilotes
│   │   ├── switches/          # Interrupteurs
│   │   ├── sensors/           # Capteurs divers
│   │   ├── lights/            # Lumières
│   │   ├── plugs/             # Prises intelligentes
│   │   ├── covers/            # Volets
│   │   ├── thermostats/       # Thermostats
│   │   ├── remotes/           # Télécommandes
│   │   └── other/             # Autres
│   └── lib/                   # Bibliothèques partagées
├── scripts/                   # Scripts utilitaires
│   ├── cleanup/              # Nettoyage du projet
│   ├── migration/            # Migration des anciens pilotes
│   └── validation/           # Validation des pilotes
├── src/                      # Code source principal
│   ├── app.js               # Point d'entrée de l'application
│   ├── lib/                 # Bibliothèques partagées
│   └── utils/               # Utilitaires
├── test/                     # Tests
│   ├── unit/                # Tests unitaires
│   ├── integration/         # Tests d'intégration
│   └── e2e/                 # Tests de bout en bout
├── .eslintrc.js             # Configuration ESLint
├── .gitignore               # Fichiers ignorés par Git
├── package.json             # Dépendances et scripts
├── README.md                # Documentation principale
└── tsconfig.json            # Configuration TypeScript
```

## 📦 Structure des Pilotes

Chaque pilote suit cette structure :

```
categories/
├── switches/
│   ├── driver1/
│   │   ├── device.ts
│   │   └── driver.compose.json
│   └── driver2/
│       ├── device.ts
│       └── driver.compose.json
├── sensors/
│   ├── driver1/
│   │   ├── device.ts
│   │   └── driver.compose.json
│   └── driver2/
│       ├── device.ts
│       └── driver.compose.json
...
```

## 🛠️ Scripts NPM

- `npm run build` - Compile le code TypeScript
- `npm run lint` - Vérifie la qualité du code
- `npm test` - Exécute les tests unitaires
- `npm run test:integration` - Exécute les tests d'intégration
- `npm run validate` - Valide la configuration de l'application

## 🔄 Workflow de Développement

1. Créer un nouveau pilote dans le dossier approprié
2. Implémenter la logique dans `device.ts`
3. Configurer le pilote dans `driver.compose.json`
4. Ajouter des tests unitaires
5. Soumettre une pull request

## 📝 Bonnes Pratiques

- Suivre les conventions de nommage
- Documenter le code avec JSDoc
- Écrire des tests pour chaque nouvelle fonctionnalité
- Maintenir la rétrocompatibilité
- Mettre à jour la documentation lors des changements majeurs
