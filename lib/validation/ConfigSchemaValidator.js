'use strict';

const fs = require('fs');
const path = require('path');

/**
 * ConfigSchemaValidator - v1.0.0
 * JSON Schema validation for driver configuration files
 *
 * Validates:
 * - driver.compose.json
 * - driver.settings.compose.json
 * - driver.flow.compose.json
 * - app.json
 */
class ConfigSchemaValidator {
  constructor() {
    this._schemas = new Map();
    this._initializeSchemas();
  }

  /**
   * Initialize validation schemas
   * @private
   */
  _initializeSchemas() {
    // Driver Compose Schema
    this._schemas.set('driver.compose.json', {
      type: 'object',
      required: ['id', 'version', 'compatibility'],
      properties: {
        id: { type: 'string', pattern: '^[a-z][a-z0-9_]*$' },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
        compatibility: { type: 'string' },
        name: { type: 'object' },
        devices: { type: 'array', minItems: 1 },
        pair: { type: 'object' }
      },
      additionalProperties: true
    });

    // Settings Compose Schema
    this._schemas.set('driver.settings.compose.json', {
      type: 'object',
      properties: {
        settings: { type: 'array' }
      },
      additionalProperties: false
    });

    // Flow Compose Schema
    this._schemas.set('driver.flow.compose.json', {
      type: 'object',
      properties: {
        tokens: { type: 'object' },
        conditions: { type: 'array' },
        actions: { type: 'array' },
        triggers: { type: 'array' }
      },
      additionalProperties: false
    });

    // App.json Schema
    this._schemas.set('app.json', {
      type: 'object',
      required: ['id', 'version', 'compatibility', 'drivers'],
      properties: {
        id: { type: 'string', pattern: '^com\\.[a-z]+\\.[a-z.]+$' },
        version: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
        compatibility: { type: 'string' },
        name: { type: 'object' },
        drivers: { type: 'array', minItems: 1 },
        flow: { type: 'object' },
        images: { type: 'object' }
      },
      additionalProperties: true
    });
  }

  /**
   * Validate a JSON file against its schema
   * @param {string} filePath - Path to JSON file
   * @param {string} schemaType - Schema type (filename)
   * @returns {Object} Validation result
   */
  validateFile(filePath, schemaType) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      file: filePath
    };

    try {
      // Read file
      if (!fs.existsSync(filePath)) {
        result.valid = false;
        result.errors.push(`File not found: ${filePath}`);
        return result;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      let data;

      try {
        data = JSON.parse(content);
      } catch (err) {
        result.valid = false;
        result.errors.push(`Invalid JSON: ${err.message}`);
        return result;
      }

      // Validate against schema
      const schemaResult = this.validateObject(data, schemaType);
      result.valid = schemaResult.valid;
      result.errors = schemaResult.errors;
      result.warnings = schemaResult.warnings;

    } catch (err) {
      result.valid = false;
      result.errors.push(`Validation error: ${err.message}`);
    }

    return result;
  }

  /**
   * Validate an object against a schema
   * @param {Object} data - Object to validate
   * @param {string} schemaType - Schema type
   * @returns {Object} Validation result
   */
  validateObject(data, schemaType) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    const schema = this._schemas.get(schemaType);
    if (!schema) {
      result.valid = false;
      result.errors.push(`Unknown schema type: ${schemaType}`);
      return result;
    }

    // Type check
    if (schema.type && typeof data !== schema.type) {
      result.valid = false;
      result.errors.push(`Expected type ${schema.type}, got ${typeof data}`);
      return result;
    }

    // Required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in data)) {
          result.valid = false;
          result.errors.push(`Missing required field: ${field}`);
        }
      }
    }

    // Property validation
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in data) {
          const propResult = this._validateProperty(data[key], propSchema, key);
          if (!propResult.valid) {
            result.valid = false;
            result.errors.push(...propResult.errors);
          }
          result.warnings.push(...propResult.warnings);
        }
      }
    }

    // Additional properties check
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = Object.keys(schema.properties);
      for (const key of Object.keys(data)) {
        if (!allowed.includes(key)) {
          result.warnings.push(`Unexpected property: ${key}`);
        }
      }
    }

    return result;
  }

  /**
   * Validate a property against its schema
   * @private
   */
  _validateProperty(value, schema, path) {
    const result = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Type check
    if (schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== schema.type) {
        result.valid = false;
        result.errors.push(`${path}: Expected type ${schema.type}, got ${actualType}`);
        return result;
      }
    }

    // String validations
    if (schema.type === 'string') {
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        result.valid = false;
        result.errors.push(`${path}: Does not match pattern ${schema.pattern}`);
      }
      if (schema.minLength && value.length < schema.minLength) {
        result.valid = false;
        result.errors.push(`${path}: Minimum length is ${schema.minLength}`);
      }
      if (schema.maxLength && value.length > schema.maxLength) {
        result.valid = false;
        result.errors.push(`${path}: Maximum length is ${schema.maxLength}`);
      }
      if (schema.enum && !schema.enum.includes(value)) {
        result.valid = false;
        result.errors.push(`${path}: Must be one of: ${schema.enum.join(', ')}`);
      }
    }

    // Number validations
    if (schema.type === 'number') {
      if (schema.minimum !== undefined && value < schema.minimum) {
        result.valid = false;
        result.errors.push(`${path}: Minimum value is ${schema.minimum}`);
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        result.valid = false;
        result.errors.push(`${path}: Maximum value is ${schema.maximum}`);
      }
      if (schema.multipleOf && value % schema.multipleOf !== 0) {
        result.valid = false;
        result.errors.push(`${path}: Must be a multiple of ${schema.multipleOf}`);
      }
    }

    // Array validations
    if (schema.type === 'array') {
      if (schema.minItems && value.length < schema.minItems) {
        result.valid = false;
        result.errors.push(`${path}: Minimum ${schema.minItems} items required`);
      }
      if (schema.maxItems && value.length > schema.maxItems) {
        result.valid = false;
        result.errors.push(`${path}: Maximum ${schema.maxItems} items allowed`);
      }
      if (schema.items) {
        value.forEach((item, index) => {
          const itemResult = this._validateProperty(item, schema.items, `${path}[${index}]`);
          if (!itemResult.valid) {
            result.valid = false;
            result.errors.push(...itemResult.errors);
          }
        });
      }
    }

    // Object validations
    if (schema.type === 'object') {
      if (schema.required) {
        for (const field of schema.required) {
          if (!(field in value)) {
            result.valid = false;
            result.errors.push(`${path}.${field}: Missing required field`);
          }
        }
      }
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          if (key in value) {
            const propResult = this._validateProperty(value[key], propSchema, `${path}.${key}`);
            if (!propResult.valid) {
              result.valid = false;
              result.errors.push(...propResult.errors);
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Validate a driver directory
   * @param {string} driverPath - Path to driver directory
   * @returns {Object} Validation result
   */
  validateDriver(driverPath) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      files: {}
    };

    // Validate driver.compose.json
    const composePath = path.join(driverPath, 'driver.compose.json');
    const composeResult = this.validateFile(composePath, 'driver.compose.json');
    result.files['driver.compose.json'] = composeResult;
    if (!composeResult.valid) {
      result.valid = false;
      result.errors.push(...composeResult.errors);
    }

    // Validate driver.settings.compose.json (optional)
    const settingsPath = path.join(driverPath, 'driver.settings.compose.json');
    if (fs.existsSync(settingsPath)) {
      const settingsResult = this.validateFile(settingsPath, 'driver.settings.compose.json');
      result.files['driver.settings.compose.json'] = settingsResult;
      if (!settingsResult.valid) {
        result.valid = false;
        result.errors.push(...settingsResult.errors);
      }
    } else {
      result.warnings.push('driver.settings.compose.json not found (optional)');
    }

    // Validate driver.flow.compose.json (optional)
    const flowPath = path.join(driverPath, 'driver.flow.compose.json');
    if (fs.existsSync(flowPath)) {
      const flowResult = this.validateFile(flowPath, 'driver.flow.compose.json');
      result.files['driver.flow.compose.json'] = flowResult;
      if (!flowResult.valid) {
        result.valid = false;
        result.errors.push(...flowResult.errors);
      }
    } else {
      result.warnings.push('driver.flow.compose.json not found (optional)');
    }

    // Check for required files
    const driverJsPath = path.join(driverPath, 'driver.js');
    if (!fs.existsSync(driverJsPath)) {
      result.warnings.push('driver.js not found');
    }

    const deviceJsPath = path.join(driverPath, 'device.js');
    if (!fs.existsSync(deviceJsPath)) {
      result.warnings.push('device.js not found');
    }

    return result;
  }

  /**
   * Validate the entire app
   * @param {string} appPath - Path to app root
   * @returns {Object} Validation result
   */
  validateApp(appPath) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      files: {},
      drivers: {}
    };

    // Validate app.json
    const appJsonPath = path.join(appPath, 'app.json');
    const appResult = this.validateFile(appJsonPath, 'app.json');
    result.files['app.json'] = appResult;
    if (!appResult.valid) {
      result.valid = false;
      result.errors.push(...appResult.errors);
    }

    // Validate all drivers
    const driversPath = path.join(appPath, 'drivers');
    if (fs.existsSync(driversPath)) {
      const driverDirs = fs.readdirSync(driversPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

      for (const driverDir of driverDirs) {
        const driverPath = path.join(driversPath, driverDir);
        const driverResult = this.validateDriver(driverPath);
        result.drivers[driverDir] = driverResult;
        if (!driverResult.valid) {
          result.valid = false;
          for (const err of driverResult.errors) {
            result.errors.push(`[${driverDir}] ${err}`);
          }
        }
      }
    } else {
      result.warnings.push('drivers/ directory not found');
    }

    return result;
  }

  /**
   * Get schema for a file type
   * @param {string} schemaType - Schema type
   * @returns {Object} Schema object
   */
  getSchema(schemaType) {
    return this._schemas.get(schemaType) || null;
  }

  /**
   * List all available schemas
   * @returns {string[]} Array of schema types
   */
  listSchemas() {
    return [...this._schemas.keys()];
  }
}

module.exports = ConfigSchemaValidator;
