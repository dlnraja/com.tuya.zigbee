/**
 * JSON Schema validation utilities
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');

class SchemaValidator {
  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    
    // Register custom formats
    this.registerCustomFormats();
  }
  
  /**
   * Register custom formats
   */
  registerCustomFormats() {
    // Tuya DP ID format (1-65535)
    this.ajv.addFormat('tuya-dp-id', {
      type: 'number',
      validate: (value) => {
        return Number.isInteger(value) && value >= 1 && value <= 65535;
      }
    });
    
    // Status values
    this.ajv.addFormat('overlay-status', {
      type: 'string',
      validate: (value) => {
        return ['proposed', 'confirmed', 'disabled'].includes(value);
      }
    });
  }
  
  /**
   * Validate overlay schema
   */
  validateOverlay(data) {
    const schema = {
      type: 'object',
      required: ['status', 'confidence', 'overlayVersion', 'productIds', 'dp'],
      properties: {
        status: { type: 'string', format: 'overlay-status' },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        overlayVersion: { type: 'string', pattern: '^\\d+\\.\\d+\\.\\d+$' },
        productIds: { 
          type: 'array', 
          items: { type: 'string' },
          minItems: 1
        },
        fwRange: { type: 'string' },
        dp: {
          type: 'object',
          patternProperties: {
            '^[0-9]+$': {
              type: 'object',
              required: ['cap', 'to'],
              properties: {
                cap: { type: 'string' },
                to: { type: 'string' }
              }
            }
          }
        },
        reports: { type: 'object' },
        features: { type: 'object' },
        exclusions: { 
          type: 'array',
          items: { type: 'string' }
        },
        sources: { 
          type: 'array',
          items: { type: 'string' }
        },
        notes: { type: 'string' }
      }
    };
    
    const validate = this.ajv.compile(schema);
    const valid = validate(data);
    
    return {
      valid,
      errors: validate.errors || []
    };
  }
  
  /**
   * Validate device matrix schema
   */
  validateDeviceMatrix(data) {
    const schema = {
      type: 'object',
      required: ['version', 'devices', 'overlays'],
      properties: {
        version: { type: 'string' },
        lastUpdated: { type: 'string' },
        devices: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'type', 'capabilities'],
            properties: {
              id: { type: 'string' },
              type: { type: 'string' },
              capabilities: { 
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        },
        overlays: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'status', 'confidence']
          }
        }
      }
    };
    
    const validate = this.ajv.compile(schema);
    const valid = validate(data);
    
    return {
      valid,
      errors: validate.errors || []
    };
  }
}

module.exports = SchemaValidator;
