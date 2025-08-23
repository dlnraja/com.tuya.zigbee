// MEGA ULTIMATE ENHANCED - 2025-08-07T16:33:44.713Z
// Script amélioré avec liens corrigés et fonctionnalités étendues

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

class LinkValidator {
  constructor() {
    this.links = {
      'github-repo': 'https://github.com/dlnraja/com.tuya.zigbee',
      'github-issues': 'https://github.com/dlnraja/com.tuya.zigbee/issues',
      'github-releases': 'https://github.com/dlnraja/com.tuya.zigbee/releases',
      'github-actions': 'https://github.com/dlnraja/com.tuya.zigbee/actions',
      'homey-app': 'https://apps.homey.app/fr/app/com.tuya.zigbee',
      'homey-community': 'https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-lite-version/140352',
      'dashboard': 'https://dlnraja.github.io/com.tuya.zigbee/dashboard/',
      'dashboard-html': 'https://dlnraja.github.io/com.tuya.zigbee/dashboard/index.html'
    };
    
    this.results = {
      valid: [],
      invalid: [],
      errors: []
    };
  }

  async validateLinks() {
    console.log('🔍 VALIDATION DES LIENS - MEGA README FIXER');
    console.log('=============================================
');
    
    for (const [name, url] of Object.entries(this.links)) {
      try {
        const isValid = await this.checkLink(url);
        if (isValid) {
          this.results.valid.push({ name, url });
          console.log(`✅ ${name}: ${url}`);
        } else {
          this.results.invalid.push({ name, url });
          console.log(`❌ ${name}: ${url}`);
        }
      } catch (error) {
        this.results.errors.push({ name, url, error: error.message });
        console.log(`⚠️ ${name}: ${url} - ${error.message}`);
      }
    }
    
    this.generateReport();
  }

  async checkLink(url) {
    return new Promise((resolve) => {
      const req = https.get(url, (res) => {
        resolve(res.statusCode >= 200 && res.statusCode < 400);
      });
      
      req.on('error', () => {
        resolve(false);
      });
      
      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  generateReport() {
    console.log('\n📊 RAPPORT DE VALIDATION DES LIENS');
    console.log('====================================');
    console.log(`✅ Liens valides: ${this.results.valid.length}`);
    console.log(`❌ Liens invalides: ${this.results.invalid.length}`);
    console.log(`⚠️ Erreurs: ${this.results.errors.length}`);
    
    if (this.results.invalid.length > 0) {
      console.log('\n❌ LIENS INVALIDES:');
      this.results.invalid.forEach(link => {
        console.log(`  - ${link.name}: ${link.url}`);
      });
    }
    
    if (this.results.errors.length > 0) {
      console.log('\n⚠️ ERREURS:');
      this.results.errors.forEach(error => {
        console.log(`  - ${error.name}: ${error.error}`);
      });
    }
    
    const successRate = Math.round((this.results.valid.length / (this.results.valid.length + this.results.invalid.length)) * 100);
    console.log(`\n📈 TAUX DE SUCCÈS: ${successRate}%`);
    
    if (successRate === 100) {
      console.log('🎉 TOUS LES LIENS SONT FONCTIONNELS !');
    } else {
      console.log('🔧 CORRECTION NÉCESSAIRE POUR CERTAINS LIENS');
    }
  }
}

// Exécuter la validation
const validator = new LinkValidator();
validator.validateLinks();