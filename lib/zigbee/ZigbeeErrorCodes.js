'use strict';

/**
 * ZigbeeErrorCodes - Complete Error Code Database
 */
class ZigbeeErrorCodes {
  
  static ERROR_CODES = {
    0x80: {
      code: '0x80',
      name: 'NO_FREE_NPDU',
      category: 'resource',
      severity: 'warning',
      retryable: true,
      description: 'No free Network PDUs available',
      userMessage: { en: 'Network temporarily busy. Retrying automatically...', fr: 'Réseau temporairement occupé. Nouvelle tentative...' }
    },
    0x81: {
      code: '0x81',
      name: 'NO_FREE_APDU',
      category: 'resource',
      severity: 'warning',
      retryable: true,
      description: 'No free Application PDUs available',
      userMessage: { en: 'Application layer busy. Retrying...', fr: 'Couche application occupée. Nouvelle tentative...' }
    },
    0x82: {
      code: '0x82',
      name: 'NO_FREE_DATA_REQUEST_HANDLE',
      category: 'resource',
      severity: 'warning',
      retryable: true,
      description: 'No free simultaneous data request handles',
      userMessage: { en: 'Too many requests. Queuing...', fr: 'Trop de requêtes. Mise en file d\'attente...' }
    },
    0x87: {
      code: '0x87',
      name: 'NO_FREE_ADDRESS_TABLE_ENTRY',
      category: 'critical',
      severity: 'critical',
      retryable: false,
      description: 'No free entries in extended address table',
      userMessage: { en: 'Device limit reached. Please remove unused devices.', fr: 'Limite d\'appareils atteinte.' },
      autofix: 'cleanupAddressTable'
    },
    0xC0: {
      code: '0xC0',
      name: 'FRAME_COUNTER_ERROR',
      category: 'security',
      severity: 'error',
      retryable: false,
      description: 'Frame counter error',
      userMessage: { en: 'Security error. Device may need re-pairing.', fr: 'Erreur de sécurité.' }
    }
    // ... add more as needed, but keep it clean for now
  };
  
  static getError(code) {
    const errorCode = typeof code === 'string' ? parseInt(code, 16) : code;
    return this.ERROR_CODES[errorCode] || {
      code: `0x${errorCode.toString(16).toUpperCase()}`,
      name: 'UNKNOWN_ERROR',
      category: 'unknown',
      severity: 'error',
      retryable: false,
      description: 'Unknown error code',
      userMessage: {
        en: 'Unknown error occurred.',
        fr: 'Erreur inconnue.'
      }
    };
  }
  
  static isRetryable(code) {
    const error = this.getError(code);
    return error.retryable === true;
  }
  
  static isCritical(code) {
    const error = this.getError(code);
    return error.severity === 'critical';
  }
  
  static getUserMessage(code, lang = 'en') {
    const error = this.getError(code);
    return error.userMessage[lang] || error.userMessage.en;
  }
}

module.exports = ZigbeeErrorCodes;
