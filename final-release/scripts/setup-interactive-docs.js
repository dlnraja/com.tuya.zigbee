#!/usr/bin/env node

/**
 * 📚 SETUP INTERACTIVE DOCS
 * Mise en place de la documentation interactive avec Swagger/ReDoc
 * Mode YOLO Ultra - Exécution immédiate
 */

const fs = require('fs');
const path = require('path');

class SetupInteractiveDocs {
  constructor() {
    this.docsConfig = {
      swagger: {
        version: '3.0.0',
        title: 'Tuya Zigbee API',
        description: 'API documentation for Tuya Zigbee Universal'
      },
      redoc: {
        theme: {
          colors: {
            primary: {
              main: '#FF6B35'
            }
          }
        }
      }
    };
  }

  async run() {
    console.log('📚 DÉMARRAGE SETUP INTERACTIVE DOCS');
    
    try {
      // 1. Créer la structure de documentation
      await this.createDocsStructure();
      
      // 2. Générer la spécification Swagger
      await this.generateSwaggerSpec();
      
      // 3. Créer l'interface Swagger UI
      await this.createSwaggerUI();
      
      // 4. Configurer ReDoc
      await this.setupReDoc();
      
      // 5. Générer les snippets de code
      await this.generateCodeSnippets();
      
      // 6. Rapport final
      await this.generateReport();
      
      console.log('✅ SETUP INTERACTIVE DOCS RÉUSSI !');
      
    } catch (error) {
      console.error('❌ ERREUR:', error.message);
      throw error;
    }
  }

  async createDocsStructure() {
    console.log('📁 Création de la structure de documentation...');
    
    const docsDirs = [
      'docs/api',
      'docs/swagger',
      'docs/redoc',
      'docs/snippets',
      'docs/examples'
    ];
    
    for (const dir of docsDirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    
    console.log('✅ Structure de documentation créée');
  }

  async generateSwaggerSpec() {
    console.log('📋 Génération de la spécification Swagger...');
    
    const swaggerSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Tuya Zigbee Universal API',
        description: 'API complète pour la gestion des devices Tuya et Zigbee',
        version: '3.0.0',
        contact: {
          name: 'Dylan Rajasekaram',
          email: 'dylan.rajasekaram+homey@gmail.com',
          url: 'https://github.com/dlnraja/com.tuya.zigbee'
        }
      },
      servers: [
        {
          url: 'http://localhost:3000/api',
          description: 'Serveur de développement'
        },
        {
          url: 'https://api.tuya-zigbee.com',
          description: 'Serveur de production'
        }
      ],
      paths: {
        '/devices': {
          get: {
            summary: 'Lister tous les devices',
            description: 'Récupère la liste de tous les devices Tuya et Zigbee',
            responses: {
              '200': {
                description: 'Liste des devices',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Device'
                      }
                    }
                  }
                }
              }
            }
          },
          post: {
            summary: 'Ajouter un device',
            description: 'Ajoute un nouveau device au système',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Device'
                  }
                }
              }
            },
            responses: {
              '201': {
                description: 'Device créé',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Device'
                    }
                  }
                }
              }
            }
          }
        },
        '/devices/{deviceId}': {
          get: {
            summary: 'Récupérer un device',
            parameters: [
              {
                name: 'deviceId',
                in: 'path',
                required: true,
                schema: {
                  type: 'string'
                }
              }
            ],
            responses: {
              '200': {
                description: 'Device trouvé',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/Device'
                    }
                  }
                }
              },
              '404': {
                description: 'Device non trouvé'
              }
            }
          },
          put: {
            summary: 'Mettre à jour un device',
            parameters: [
              {
                name: 'deviceId',
                in: 'path',
                required: true,
                schema: {
                  type: 'string'
                }
              }
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Device'
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Device mis à jour'
              }
            }
          },
          delete: {
            summary: 'Supprimer un device',
            parameters: [
              {
                name: 'deviceId',
                in: 'path',
                required: true,
                schema: {
                  type: 'string'
                }
              }
            ],
            responses: {
              '204': {
                description: 'Device supprimé'
              }
            }
          }
        },
        '/devices/{deviceId}/capabilities': {
          get: {
            summary: 'Récupérer les capacités d\'un device',
            parameters: [
              {
                name: 'deviceId',
                in: 'path',
                required: true,
                schema: {
                  type: 'string'
                }
              }
            ],
            responses: {
              '200': {
                description: 'Capacités du device',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Capability'
                      }
                    }
                  }
                }
              }
            }
          }
        },
        '/webhooks/tuya-zigbee': {
          post: {
            summary: 'Webhook Tuya Zigbee',
            description: 'Endpoint pour recevoir les données des devices Tuya/Zigbee',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/WebhookData'
                  }
                }
              }
            },
            responses: {
              '200': {
                description: 'Données reçues avec succès'
              }
            }
          }
        }
      },
      components: {
        schemas: {
          Device: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Identifiant unique du device'
              },
              name: {
                type: 'string',
                description: 'Nom du device'
              },
              type: {
                type: 'string',
                enum: ['tuya', 'zigbee'],
                description: 'Type de device'
              },
              model: {
                type: 'string',
                description: 'Modèle du device'
              },
              capabilities: {
                type: 'array',
                items: {
                  type: 'string'
                },
                description: 'Liste des capacités du device'
              },
              state: {
                type: 'object',
                description: 'État actuel du device'
              },
              lastSeen: {
                type: 'string',
                format: 'date-time',
                description: 'Dernière fois vu'
              }
            },
            required: ['id', 'name', 'type']
          },
          Capability: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: 'Nom de la capacité'
              },
              type: {
                type: 'string',
                description: 'Type de la capacité'
              },
              value: {
                type: 'object',
                description: 'Valeur actuelle'
              }
            }
          },
          WebhookData: {
            type: 'object',
            properties: {
              device_id: {
                type: 'string',
                description: 'Identifiant du device'
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Timestamp de l\'événement'
              },
              data: {
                type: 'object',
                description: 'Données du device'
              }
            },
            required: ['device_id', 'timestamp', 'data']
          }
        }
      }
    };
    
    fs.writeFileSync('docs/swagger/swagger.json', JSON.stringify(swaggerSpec, null, 2));
    
    console.log('✅ Spécification Swagger générée');
  }

  async createSwaggerUI() {
    console.log('🎨 Création de l\'interface Swagger UI...');
    
    const swaggerHTML = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tuya Zigbee API - Documentation</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin:0;
            background: #fafafa;
        }
        .swagger-ui .topbar {
            background-color: #FF6B35;
        }
        .swagger-ui .topbar .download-url-wrapper .select-label {
            color: white;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.0.0/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: './swagger.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                validatorUrl: null,
                docExpansion: "list",
                filter: true,
                showExtensions: true,
                showCommonExtensions: true
            });
        };
    </script>
</body>
</html>`;
    
    fs.writeFileSync('docs/swagger/index.html', swaggerHTML);
    
    console.log('✅ Interface Swagger UI créée');
  }

  async setupReDoc() {
    console.log('📖 Configuration de ReDoc...');
    
    const redocHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Tuya Zigbee API - ReDoc</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
        }
    </style>
</head>
<body>
    <redoc spec-url="./swagger.json"></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@2.0.0/bundles/redoc.standalone.js"></script>
</body>
</html>`;
    
    fs.writeFileSync('docs/redoc/index.html', redocHTML);
    
    console.log('✅ ReDoc configuré');
  }

  async generateCodeSnippets() {
    console.log('💻 Génération des snippets de code...');
    
    // Snippets JavaScript
    const jsSnippets = {
      'get-devices.js': `// Récupérer tous les devices
const response = await fetch('/api/devices');
const devices = await response.json();
console.log('Devices:', devices);`,
      
      'get-device.js': `// Récupérer un device spécifique
const deviceId = 'device_123';
const response = await fetch(\`/api/devices/\${deviceId}\`);
const device = await response.json();
console.log('Device:', device);`,
      
      'create-device.js': `// Créer un nouveau device
const newDevice = {
  id: 'device_456',
  name: 'Nouveau Device',
  type: 'tuya',
  model: 'TS0601_switch',
  capabilities: ['onoff']
};

const response = await fetch('/api/devices', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newDevice)
});

const createdDevice = await response.json();
console.log('Device créé:', createdDevice);`,
      
      'update-device.js': `// Mettre à jour un device
const deviceId = 'device_123';
const updates = {
  name: 'Device Mis à Jour',
  state: { on: true }
};

const response = await fetch(\`/api/devices/\${deviceId}\`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(updates)
});

console.log('Device mis à jour');`,
      
      'webhook.js': `// Exemple de webhook
const webhookData = {
  device_id: 'device_123',
  timestamp: new Date().toISOString(),
  data: {
    state: 'on',
    brightness: 50
  }
};

const response = await fetch('/api/webhooks/tuya-zigbee', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(webhookData)
});

console.log('Webhook envoyé');`
    };
    
    // Snippets Python
    const pythonSnippets = {
      'get_devices.py': `import requests

# Récupérer tous les devices
response = requests.get('/api/devices')
devices = response.json()
print('Devices:', devices)`,
      
      'get_device.py': `import requests

# Récupérer un device spécifique
device_id = 'device_123'
response = requests.get(f'/api/devices/{device_id}')
device = response.json()
print('Device:', device)`,
      
      'create_device.py': `import requests
import json

# Créer un nouveau device
new_device = {
    'id': 'device_456',
    'name': 'Nouveau Device',
    'type': 'tuya',
    'model': 'TS0601_switch',
    'capabilities': ['onoff']
}

response = requests.post('/api/devices', 
    headers={'Content-Type': 'application/json'},
    data=json.dumps(new_device))

created_device = response.json()
print('Device créé:', created_device)`,
      
      'webhook.py': `import requests
import json
from datetime import datetime

# Exemple de webhook
webhook_data = {
    'device_id': 'device_123',
    'timestamp': datetime.now().isoformat(),
    'data': {
        'state': 'on',
        'brightness': 50
    }
}

response = requests.post('/api/webhooks/tuya-zigbee',
    headers={'Content-Type': 'application/json'},
    data=json.dumps(webhook_data))

print('Webhook envoyé')`
    };
    
    // Créer les fichiers JavaScript
    for (const [filename, code] of Object.entries(jsSnippets)) {
      fs.writeFileSync(`docs/snippets/javascript/${filename}`, code);
    }
    
    // Créer les fichiers Python
    for (const [filename, code] of Object.entries(pythonSnippets)) {
      fs.writeFileSync(`docs/snippets/python/${filename}`, code);
    }
    
    // Créer l'index des snippets
    const snippetsIndex = `# 💻 Snippets de Code

## JavaScript

- [get-devices.js](javascript/get-devices.js) - Récupérer tous les devices
- [get-device.js](javascript/get-device.js) - Récupérer un device spécifique
- [create-device.js](javascript/create-device.js) - Créer un nouveau device
- [update-device.js](javascript/update-device.js) - Mettre à jour un device
- [webhook.js](javascript/webhook.js) - Exemple de webhook

## Python

- [get_devices.py](python/get_devices.py) - Récupérer tous les devices
- [get_device.py](python/get_device.py) - Récupérer un device spécifique
- [create_device.py](python/create_device.py) - Créer un nouveau device
- [webhook.py](python/webhook.py) - Exemple de webhook

## Utilisation

1. Copier le snippet souhaité
2. Adapter l'URL de l'API selon votre configuration
3. Modifier les données selon vos besoins
4. Exécuter le code

## Exemples

### JavaScript
\`\`\`javascript
// Exemple complet
const API_BASE = 'http://localhost:3000/api';

async function getDevices() {
  const response = await fetch(\`\${API_BASE}/devices\`);
  return await response.json();
}

getDevices().then(devices => {
  console.log('Devices:', devices);
});
\`\`\`

### Python
\`\`\`python
import requests

API_BASE = 'http://localhost:3000/api'

def get_devices():
    response = requests.get(f'{API_BASE}/devices')
    return response.json()

devices = get_devices()
print('Devices:', devices)
\`\`\``;
    
    fs.writeFileSync('docs/snippets/README.md', snippetsIndex);
    
    console.log('✅ Snippets de code générés');
  }

  async generateReport() {
    console.log('📊 Génération du rapport...');
    
    const report = {
      timestamp: new Date().toISOString(),
      swagger: {
        spec: 'docs/swagger/swagger.json',
        ui: 'docs/swagger/index.html'
      },
      redoc: {
        ui: 'docs/redoc/index.html'
      },
      snippets: {
        javascript: 5,
        python: 4,
        index: 'docs/snippets/README.md'
      },
      endpoints: [
        'GET /api/devices',
        'POST /api/devices',
        'GET /api/devices/{deviceId}',
        'PUT /api/devices/{deviceId}',
        'DELETE /api/devices/{deviceId}',
        'GET /api/devices/{deviceId}/capabilities',
        'POST /api/webhooks/tuya-zigbee'
      ]
    };
    
    const reportPath = 'reports/interactive-docs-report.json';
    fs.mkdirSync('reports', { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Rapport sauvegardé: ${reportPath}`);
    
    // Affichage du résumé
    console.log('\n📊 RÉSUMÉ SETUP INTERACTIVE DOCS:');
    console.log('✅ Swagger UI créé');
    console.log('✅ ReDoc configuré');
    console.log('✅ Snippets générés');
    console.log(`📋 Endpoints: ${report.endpoints.length}`);
    console.log(`💻 Snippets JS: ${report.snippets.javascript}`);
    console.log(`🐍 Snippets Python: ${report.snippets.python}`);
  }
}

// Exécution immédiate
if (require.main === module) {
  const setup = new SetupInteractiveDocs();
  setup.run().then(() => {
    console.log('🎉 SETUP INTERACTIVE DOCS TERMINÉ AVEC SUCCÈS !');
    process.exit(0);
  }).catch(error => {
    console.error('❌ ERREUR FATALE:', error);
    process.exit(1);
  });
}

module.exports = SetupInteractiveDocs; 