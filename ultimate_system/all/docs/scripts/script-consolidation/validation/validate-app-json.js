#!/usr/bin/env node
'use strict';

#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const readFile = promisify(fs.readFile);

const APP_JSON_PATH = path.resolve(process.cwd(), '.homeybuild/app.json');
const SCHEMA_PATH = path.resolve(process.cwd(), 'schemas/homey-app.schema.json');

class AppJsonValidator {
  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      strict: false,
      allowUnionTypes: true,
    });
    addFormats(this.ajv);
    
    this.errors = [];
    this.warnings = [];
  }

  async validate() {
    try {
      console.log('🔍 Validating app.json against schema...');
      
      // Load schema and app.json
      const [schema, appJson] = await Promise.all([
        this.loadJson(SCHEMA_PATH, 'schema'),
        this.loadJson(APP_JSON_PATH, 'app.json')
      ]);
      
      // Validate against schema
      const validate = this.ajv.compile(schema);
      const isValid = validate(appJson);
      
      if (!isValid) {
        this.processValidationErrors(validate.errors, appJson);
      }
      
      // Run additional validations
      this.checkDriverIds(appJson);
      this.checkImageAssets(appJson);
      
      this.reportResults();
      
      return this.errors.length === 0;
    } catch (error) {
      console.error('❌ Error during validation:', error.message);
      return false;
    }
  }

  async loadJson(filePath, description) {
    try {
      const content = await readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to load ${description} (${filePath}): ${error.message}`);
    }
  }

  processValidationErrors(errors, appJson) {
    if (!errors || !Array.isArray(errors)) return;
    
    errors.forEach(error => {
      const instancePath = error.instancePath || 'root';
      const message = `${instancePath}: ${error.message}`;
      
      // Classify as warning or error
      if (this.isWarning(error)) {
        this.warnings.push(message);
      } else {
        this.errors.push(message);
      }
    });
  }
  
  isWarning(error) {
    // These are typically not critical and can be warnings
    const warningKeywords = ['additionalProperties', 'format'];
    return warningKeywords.some(keyword => error.keyword === keyword);
  }

  checkDriverIds(appJson) {
    if (!appJson.drivers || !Array.isArray(appJson.drivers)) return;
    
    const idMap = new Map();
    
    appJson.drivers.forEach((driver, index) => {
      if (!driver.id) {
        this.errors.push(`Driver at index ${index} is missing an ID`);
        return;
      }
      
      if (idMap.has(driver.id)) {
        this.errors.push(`Duplicate driver ID: ${driver.id} at indices ${idMap.get(driver.id)} and ${index}`);
      } else {
        idMap.set(driver.id, index);
      }
      
      // Check for invalid characters in ID
      if (!/^[a-z0-9-]+$/.test(driver.id)) {
        this.errors.push(`Invalid driver ID format: ${driver.id}. Use only lowercase letters, numbers, and hyphens.`);
      }
    });
  }

  checkImageAssets(appJson) {
    if (!appJson.drivers || !Array.isArray(appJson.drivers)) return;
    
    appJson.drivers.forEach(driver => {
      if (!driver.images) return;
      
      ['small', 'large'].forEach(size => {
        const imagePath = driver.images[size];
        if (!imagePath) {
          this.errors.push(`Driver ${driver.id} is missing ${size} image`);
          return;
        }
        
        const fullPath = path.resolve(path.dirname(APP_JSON_PATH), imagePath);
        if (!fs.existsSync(fullPath)) {
          this.errors.push(`Missing ${size} image for driver ${driver.id}: ${fullPath}`);
        }
      });
    });
  }

  reportResults() {
    // Report errors
    if (this.errors.length > 0) {
      console.error('\n❌ Validation errors:');
      this.errors.forEach((error, index) => {
        console.error(`${index + 1}. ${error}`);
      });
    }
    
    // Report warnings
    if (this.warnings.length > 0) {
      console.warn('\n⚠️  Validation warnings:');
      this.warnings.forEach((warning, index) => {
        console.warn(`${index + 1}. ${warning}`);
      });
    }
    
    // Summary
    console.log('\n📊 Validation summary:');
    console.log(`- ${this.errors.length} error(s)`);
    console.log(`- ${this.warnings.length} warning(s)`);
    
    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ app.json is valid!');
    } else if (this.errors.length === 0) {
      console.log('ℹ️  app.json has warnings but no errors.');
    } else {
      console.log('❌ app.json has validation errors.');
    }
  }
}

// Run the validator
if (require.main === module) {
  const validator = new AppJsonValidator();
  validator.validate().then(isValid => {
    process.exit(isValid ? 0 : 1);
  }).catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { AppJsonValidator };
