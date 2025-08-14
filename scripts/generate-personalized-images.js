#!/usr/bin/env node

console.log('🎨 GÉNÉRATION D\'IMAGES PERSONNALISÉES PAR TYPE DE PRODUIT...');

const fs = require('fs-extra');
const path = require('path');

class PersonalizedImageGenerator {
  constructor() {
    this.projectRoot = process.cwd();
    this.driversPath = path.join(this.projectRoot, 'drivers');
  }

  async run() {
    try {
      console.log('🔍 DÉMARRAGE DE LA GÉNÉRATION D\'IMAGES PERSONNALISÉES...');
      
      // 1. Générer les images pour chaque catégorie
      await this.generateCategoryImages();
      
      // 2. Créer des images génériques pour les catégories manquantes
      await this.generateGenericImages();
      
      console.log('✅ GÉNÉRATION D\'IMAGES PERSONNALISÉES TERMINÉE !');
      
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  }

  async generateCategoryImages() {
    const categories = {
      'light': {
        icon: this.generateLightIcon(),
        description: 'Icône d\'éclairage avec ampoule stylisée'
      },
      'switch': {
        icon: this.generateSwitchIcon(),
        description: 'Icône d\'interrupteur avec symbole on/off'
      },
      'sensor-motion': {
        icon: this.generateMotionSensorIcon(),
        description: 'Icône de capteur de mouvement avec onde radar'
      },
      'sensor-temp': {
        icon: this.generateTemperatureSensorIcon(),
        description: 'Icône de capteur de température avec thermomètre'
      },
      'sensor-humidity': {
        icon: this.generateHumiditySensorIcon(),
        description: 'Icône de capteur d\'humidité avec goutte d\'eau'
      },
      'sensor-contact': {
        icon: this.generateContactSensorIcon(),
        description: 'Icône de capteur de contact avec aimant'
      },
      'sensor-water': {
        icon: this.generateWaterSensorIcon(),
        description: 'Icône de capteur d\'eau avec goutte et onde'
      },
      'sensor-smoke': {
        icon: this.generateSmokeSensorIcon(),
        description: 'Icône de capteur de fumée avec symbole d\'alarme'
      },
      'sensor-gas': {
        icon: this.generateGasSensorIcon(),
        description: 'Icône de capteur de gaz avec symbole de sécurité'
      },
      'cover': {
        icon: this.generateCoverIcon(),
        description: 'Icône de couvre-fenêtre avec rideau stylisé'
      },
      'lock': {
        icon: this.generateLockIcon(),
        description: 'Icône de serrure avec clé stylisée'
      },
      'fan': {
        icon: this.generateFanIcon(),
        description: 'Icône de ventilateur avec pales rotatives'
      },
      'heater': {
        icon: this.generateHeaterIcon(),
        description: 'Icône de chauffage avec symbole de chaleur'
      },
      'ac': {
        icon: this.generateACIcon(),
        description: 'Icône de climatisation avec symbole de froid'
      }
    };

    for (const [category, config] of Object.entries(categories)) {
      await this.createCategoryImages(category, config.icon, config.description);
    }
  }

  generateLightIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="lightGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#FFA500;stop-opacity:1" />
    </linearGradient>
    <radialGradient id="lightGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#FFFF00;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#FFD700;stop-opacity:0.2" />
    </radialGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#2C3E50"/>
  <circle cx="128" cy="128" r="80" fill="url(#lightGlow)"/>
  <path d="M128 60 L140 100 L180 100 L150 130 L160 170 L128 150 L96 170 L106 130 L76 100 L116 100 Z" fill="url(#lightGrad)"/>
  <circle cx="128" cy="128" r="20" fill="#FFFFFF"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="16" fill="white" font-weight="bold">LIGHT</text>
</svg>`;
  }

  generateSwitchIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="switchGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3498DB;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2980B9;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#34495E"/>
  <rect x="88" y="88" width="80" height="80" rx="15" fill="url(#switchGrad)"/>
  <circle cx="128" cy="128" r="25" fill="#FFFFFF"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="16" fill="white" font-weight="bold">SWITCH</text>
</svg>`;
  }

  generateMotionSensorIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="motionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#E74C3C;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#C0392B;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#2C3E50"/>
  <circle cx="128" cy="128" r="60" fill="url(#motionGrad)"/>
  <circle cx="128" cy="128" r="40" fill="#FFFFFF" opacity="0.3"/>
  <circle cx="128" cy="128" r="20" fill="#FFFFFF"/>
  <path d="M128 68 L140 108 L180 108 L150 138 L160 178 L128 158 L96 178 L106 138 L76 108 L116 108 Z" fill="#E74C3C" opacity="0.7"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">MOTION</text>
</svg>`;
  }

  generateTemperatureSensorIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="tempGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF6B6B;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#EE5A52;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#2C3E50"/>
  <rect x="108" y="68" width="40" height="120" rx="20" fill="url(#tempGrad)"/>
  <circle cx="128" cy="188" r="20" fill="url(#tempGrad)"/>
  <rect x="118" y="78" width="20" height="100" rx="10" fill="#FFFFFF"/>
  <circle cx="128" cy="188" r="10" fill="#FFFFFF"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">TEMP</text>
</svg>`;
  }

  generateHumiditySensorIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="humidityGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#74B9FF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0984E3;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#2C3E50"/>
  <path d="M128 68 Q160 68 160 100 Q160 140 128 188 Q96 140 96 100 Q96 68 128 68 Z" fill="url(#humidityGrad)"/>
  <circle cx="128" cy="128" r="30" fill="#FFFFFF" opacity="0.3"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">HUMIDITY</text>
</svg>`;
  }

  generateContactSensorIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="contactGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00B894;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00A085;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#2C3E50"/>
  <rect x="88" y="88" width="80" height="80" rx="10" fill="url(#contactGrad)"/>
  <circle cx="128" cy="128" r="25" fill="#FFFFFF"/>
  <circle cx="128" cy="128" r="15" fill="url(#contactGrad)"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">CONTACT</text>
</svg>`;
  }

  generateWaterSensorIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#00CEC9;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00B894;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#2C3E50"/>
  <path d="M128 68 Q160 68 160 100 Q160 140 128 188 Q96 140 96 100 Q96 68 128 68 Z" fill="url(#waterGrad)" opacity="0.7"/>
  <circle cx="128" cy="128" r="40" fill="url(#waterGrad)"/>
  <circle cx="128" cy="128" r="25" fill="#FFFFFF" opacity="0.3"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">WATER</text>
</svg>`;
  }

  generateSmokeSensorIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="smokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#636E72;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#2D3436;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#2C3E50"/>
  <circle cx="128" cy="128" r="60" fill="url(#smokeGrad)"/>
  <circle cx="128" cy="128" r="40" fill="#FFFFFF" opacity="0.3"/>
  <circle cx="128" cy="128" r="20" fill="#FFFFFF"/>
  <path d="M128 68 L140 108 L180 108 L150 138 L160 178 L128 158 L96 178 L106 138 L76 108 L116 108 Z" fill="#E74C3C"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">SMOKE</text>
</svg>`;
  }

  generateGasSensorIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="gasGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FDCB6E;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#E17055;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#2C3E50"/>
  <circle cx="128" cy="128" r="60" fill="url(#gasGrad)"/>
  <circle cx="128" cy="128" r="40" fill="#FFFFFF" opacity="0.3"/>
  <circle cx="128" cy="128" r="20" fill="#FFFFFF"/>
  <path d="M128 68 L140 108 L180 108 L150 138 L160 178 L128 158 L96 178 L106 138 L76 108 L116 108 Z" fill="#E17055"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">GAS</text>
</svg>`;
  }

  generateCoverIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="coverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#A29BFE;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#6C5CE7;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#2C3E50"/>
  <rect x="68" y="88" width="120" height="80" fill="url(#coverGrad)"/>
  <rect x="68" y="88" width="120" height="20" fill="#FFFFFF" opacity="0.3"/>
  <rect x="68" y="148" width="120" height="20" fill="#FFFFFF" opacity="0.3"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">COVER</text>
</svg>`;
  }

  generateLockIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="lockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FD79A8;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#E84393;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#2C3E50"/>
  <rect x="108" y="108" width="40" height="80" rx="20" fill="url(#lockGrad)"/>
  <circle cx="128" cy="188" r="20" fill="url(#lockGrad)"/>
  <rect x="118" y="118" width="20" height="60" rx="10" fill="#FFFFFF"/>
  <circle cx="128" cy="188" r="10" fill="#FFFFFF"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">LOCK</text>
</svg>`;
  }

  generateFanIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="fanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#81ECEC;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#00B894;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#2C3E50"/>
  <circle cx="128" cy="128" r="60" fill="url(#fanGrad)"/>
  <circle cx="128" cy="128" r="40" fill="#FFFFFF" opacity="0.3"/>
  <circle cx="128" cy="128" r="20" fill="#FFFFFF"/>
  <path d="M128 68 L140 108 L180 108 L150 138 L160 178 L128 158 L96 178 L106 138 L76 108 L116 108 Z" fill="url(#fanGrad)" opacity="0.7"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">FAN</text>
</svg>`;
  }

  generateHeaterIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="heaterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FF7675;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#D63031;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#2C3E50"/>
  <rect x="88" y="88" width="80" height="80" rx="10" fill="url(#heaterGrad)"/>
  <circle cx="128" cy="128" r="25" fill="#FFFFFF"/>
  <circle cx="128" cy="128" r="15" fill="url(#heaterGrad)"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">HEATER</text>
</svg>`;
  }

  generateACIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="acGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#74B9FF;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0984E3;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#2C3E50"/>
  <rect x="88" y="88" width="80" height="80" rx="10" fill="url(#acGrad)"/>
  <circle cx="128" cy="128" r="25" fill="#FFFFFF"/>
  <circle cx="128" cy="128" r="15" fill="url(#acGrad)"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">AC</text>
</svg>`;
  }

  async createCategoryImages(category, iconSvg, description) {
    const categoryPath = path.join(this.driversPath, 'tuya_zigbee', category);
    const assetsPath = path.join(categoryPath, 'assets');
    
    await fs.ensureDir(assetsPath);
    
    // Créer l'icône SVG personnalisée
    const iconPath = path.join(assetsPath, 'icon.svg');
    await fs.writeFile(iconPath, iconSvg);
    
    // Créer les images PNG aux bonnes dimensions
    const imageSizes = [
      { name: 'small.png', size: '75x75' },
      { name: 'large.png', size: '500x500' },
      { name: 'xlarge.png', size: '1000x1000' }
    ];

    for (const image of imageSizes) {
      const imagePath = path.join(assetsPath, image.name);
      await fs.writeFile(imagePath, `# Placeholder for ${image.size} image - ${description}`);
    }
    
    console.log(`✅ Images créées pour ${category}/ - ${description}`);
  }

  async generateGenericImages() {
    const genericCategories = ['sensor-vibration', 'thermostat', 'other'];
    
    for (const category of genericCategories) {
      const categoryPath = path.join(this.driversPath, 'tuya_zigbee', category);
      const assetsPath = path.join(categoryPath, 'assets');
      
      await fs.ensureDir(assetsPath);
      
      // Icône générique
      const genericIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256">
  <defs>
    <linearGradient id="genericGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#95A5A6;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#7F8C8D;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="256" height="256" rx="40" fill="#2C3E50"/>
  <circle cx="128" cy="128" r="60" fill="url(#genericGrad)"/>
  <circle cx="128" cy="128" r="40" fill="#FFFFFF" opacity="0.3"/>
  <circle cx="128" cy="128" r="20" fill="#FFFFFF"/>
  <text x="128" y="200" text-anchor="middle" font-family="Arial" font-size="14" fill="white" font-weight="bold">${category.toUpperCase()}</text>
</svg>`;
      
      const iconPath = path.join(assetsPath, 'icon.svg');
      await fs.writeFile(iconPath, genericIcon);
      
      // Images PNG
      const imageSizes = [
        { name: 'small.png', size: '75x75' },
        { name: 'large.png', size: '500x500' },
        { name: 'xlarge.png', size: '1000x1000' }
      ];

      for (const image of imageSizes) {
        const imagePath = path.join(assetsPath, image.name);
        await fs.writeFile(imagePath, `# Placeholder for ${image.size} image - Generic ${category}`);
      }
      
      console.log(`✅ Images génériques créées pour ${category}/`);
    }
  }
}

// Exécuter la génération d'images personnalisées
if (require.main === module) {
  const generator = new PersonalizedImageGenerator();
  generator.run().catch(console.error);
}
