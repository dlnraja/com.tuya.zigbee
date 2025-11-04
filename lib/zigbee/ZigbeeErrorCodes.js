'use strict';

/**
 * ZigbeeErrorCodes - Complete Error Code Database
 * 
 * Based on ZiGate comprehensive error handling
 * Source: https://zigate.fr/documentation/commandes-zigate/
 * 
 * Provides:
 * - Complete error code definitions
 * - Error severity classification
 * - Automatic recovery strategies
 * - User-friendly error messages
 */

class ZigbeeErrorCodes {
  
  static ERROR_CODES = {
    
    // ========================================================================
    // RESOURCE SHORTAGE ERRORS (0x80-0x8B) - Retrying may succeed
    // ========================================================================
    
    0x80: {
      code: '0x80',
      name: 'NO_FREE_NPDU',
      category: 'resource',
      severity: 'warning',
      retryable: true,
      description: 'No free Network PDUs available',
      cause: 'Network PDU pool exhausted',
      solution: 'Retry after delay, reduce network load',
      userMessage: {
        en: 'Network temporarily busy. Retrying automatically...',
        fr: 'Réseau temporairement occupé. Nouvelle tentative...'
      }
    },
    
    0x81: {
      code: '0x81',
      name: 'NO_FREE_APDU',
      category: 'resource',
      severity: 'warning',
      retryable: true,
      description: 'No free Application PDUs available',
      cause: 'Application PDU pool exhausted',
      solution: 'Retry after delay, reduce application load',
      userMessage: {
        en: 'Application layer busy. Retrying...',
        fr: 'Couche application occupée. Nouvelle tentative...'
      }
    },
    
    0x82: {
      code: '0x82',
      name: 'NO_FREE_DATA_REQUEST_HANDLE',
      category: 'resource',
      severity: 'warning',
      retryable: true,
      description: 'No free simultaneous data request handles',
      cause: 'Too many simultaneous data requests',
      solution: 'Queue requests, implement rate limiting',
      userMessage: {
        en: 'Too many requests. Queuing...',
        fr: 'Trop de requêtes. Mise en file d\'attente...'
      }
    },
    
    0x83: {
      code: '0x83',
      name: 'NO_FREE_ACK_HANDLE',
      category: 'resource',
      severity: 'warning',
      retryable: true,
      description: 'No free APS acknowledgement handles',
      cause: 'Too many requests awaiting acknowledgement',
      solution: 'Wait for acknowledgements, reduce concurrent requests',
      userMessage: {
        en: 'Waiting for acknowledgements...',
        fr: 'En attente d\'accusés de réception...'
      }
    },
    
    0x84: {
      code: '0x84',
      name: 'NO_FREE_FRAGMENT_HANDLE',
      category: 'resource',
      severity: 'warning',
      retryable: true,
      description: 'No free fragment record handles',
      cause: 'Too many fragmented messages in flight',
      solution: 'Wait for fragment transmission to complete',
      userMessage: {
        en: 'Large message in progress. Waiting...',
        fr: 'Message volumineux en cours. Attente...'
      }
    },
    
    0x85: {
      code: '0x85',
      name: 'NO_FREE_MCPS_DESCRIPTOR',
      category: 'resource',
      severity: 'warning',
      retryable: true,
      description: 'No free MCPS request descriptors (8 max)',
      cause: 'Heavy network load or too many frames too close',
      solution: 'Implement frame spacing, reduce transmission rate',
      userMessage: {
        en: 'Network overloaded. Slowing down...',
        fr: 'Réseau surchargé. Ralentissement...'
      }
    },
    
    0x86: {
      code: '0x86',
      name: 'LOOPBACK_BUSY',
      category: 'resource',
      severity: 'warning',
      retryable: true,
      description: 'Loopback send currently busy (only 1 at a time)',
      cause: 'Previous loopback not completed',
      solution: 'Wait for previous loopback to complete',
      userMessage: {
        en: 'Internal communication busy. Retrying...',
        fr: 'Communication interne occupée. Nouvelle tentative...'
      }
    },
    
    0x87: {
      code: '0x87',
      name: 'NO_FREE_ADDRESS_TABLE_ENTRY',
      category: 'critical',
      severity: 'critical',
      retryable: false,
      description: 'No free entries in extended address table',
      cause: 'Address table full - max devices reached',
      solution: 'Remove unused devices, cleanup address table',
      userMessage: {
        en: 'Device limit reached. Please remove unused devices.',
        fr: 'Limite d\'appareils atteinte. Veuillez supprimer les appareils inutilisés.'
      },
      autofix: 'cleanupAddressTable'
    },
    
    0x88: {
      code: '0x88',
      name: 'SIMPLE_DESCRIPTOR_NOT_EXIST',
      category: 'configuration',
      severity: 'error',
      retryable: false,
      description: 'Simple descriptor does not exist for endpoint/cluster',
      cause: 'Invalid endpoint or cluster for this device',
      solution: 'Check device capabilities, use correct endpoint',
      userMessage: {
        en: 'Unsupported feature for this device.',
        fr: 'Fonctionnalité non supportée pour cet appareil.'
      }
    },
    
    0x89: {
      code: '0x89',
      name: 'BAD_PARAMETER',
      category: 'configuration',
      severity: 'error',
      retryable: false,
      description: 'Bad parameter in APSDE request or response',
      cause: 'Invalid parameter value',
      solution: 'Check and correct parameters',
      userMessage: {
        en: 'Invalid command parameters.',
        fr: 'Paramètres de commande invalides.'
      }
    },
    
    0x8A: {
      code: '0x8A',
      name: 'NO_FREE_ROUTING_TABLE_ENTRY',
      category: 'critical',
      severity: 'critical',
      retryable: false,
      description: 'No free routing table entries',
      cause: 'Routing table full',
      solution: 'Cleanup routing table, reduce network size',
      userMessage: {
        en: 'Network routing table full. Cleanup required.',
        fr: 'Table de routage réseau pleine. Nettoyage requis.'
      },
      autofix: 'cleanupRoutingTable'
    },
    
    0x8B: {
      code: '0x8B',
      name: 'NO_FREE_BTR_ENTRY',
      category: 'resource',
      severity: 'warning',
      retryable: true,
      description: 'No free BTR (Broadcast Transaction Record) entries',
      cause: 'Too many concurrent broadcasts',
      solution: 'Queue broadcasts, limit concurrent broadcasts',
      userMessage: {
        en: 'Too many broadcasts. Queuing...',
        fr: 'Trop de diffusions. Mise en file d\'attente...'
      },
      autofix: 'queueBroadcast'
    },
    
    // ========================================================================
    // SECURITY ERRORS (0xC0-0xCA) - ZiGate+ v3.22+
    // ========================================================================
    
    0xC0: {
      code: '0xC0',
      name: 'FRAME_COUNTER_ERROR',
      category: 'security',
      severity: 'error',
      retryable: false,
      description: 'Frame counter error - potential replay attack',
      cause: 'Invalid frame counter sequence',
      solution: 'Re-pair device, reset security',
      userMessage: {
        en: 'Security error. Device may need re-pairing.',
        fr: 'Erreur de sécurité. L\'appareil doit peut-être être ré-appairé.'
      }
    },
    
    0xC1: {
      code: '0xC1',
      name: 'CCM_INVALID_ERROR',
      category: 'security',
      severity: 'error',
      retryable: false,
      description: 'CCM encryption/decryption invalid',
      cause: 'Encryption failure',
      solution: 'Re-pair device, check security keys',
      userMessage: {
        en: 'Encryption error. Re-pairing recommended.',
        fr: 'Erreur de chiffrement. Ré-appairage recommandé.'
      }
    },
    
    0xC2: {
      code: '0xC2',
      name: 'UNKNOWN_SRC_ADDR',
      category: 'security',
      severity: 'error',
      retryable: false,
      description: 'Unknown source address',
      cause: 'Message from unknown device',
      solution: 'Check device pairing, verify network security',
      userMessage: {
        en: 'Unknown device attempting communication.',
        fr: 'Appareil inconnu tentant de communiquer.'
      }
    },
    
    0xC3: {
      code: '0xC3',
      name: 'NO_KEY_DESCRIPTOR',
      category: 'security',
      severity: 'error',
      retryable: false,
      description: 'No key descriptor available',
      cause: 'Missing security key',
      solution: 'Re-pair device to establish security',
      userMessage: {
        en: 'Security key missing. Re-pairing required.',
        fr: 'Clé de sécurité manquante. Ré-appairage requis.'
      }
    },
    
    0xC4: {
      code: '0xC4',
      name: 'NULL_KEY_DESCRIPTOR',
      category: 'security',
      severity: 'error',
      retryable: false,
      description: 'Null key descriptor',
      cause: 'Invalid key descriptor',
      solution: 'Re-pair device',
      userMessage: {
        en: 'Invalid security key. Re-pairing required.',
        fr: 'Clé de sécurité invalide. Ré-appairage requis.'
      }
    },
    
    0xC5: {
      code: '0xC5',
      name: 'PDUM_ERROR',
      category: 'system',
      severity: 'error',
      retryable: true,
      description: 'PDU Manager error',
      cause: 'Internal PDU management error',
      solution: 'Retry operation, restart if persists',
      userMessage: {
        en: 'Internal error. Retrying...',
        fr: 'Erreur interne. Nouvelle tentative...'
      }
    },
    
    0xC6: {
      code: '0xC6',
      name: 'NULL_EXT_ADDR',
      category: 'configuration',
      severity: 'error',
      retryable: false,
      description: 'Null extended address',
      cause: 'Missing device extended address',
      solution: 'Check device configuration',
      userMessage: {
        en: 'Device address error.',
        fr: 'Erreur d\'adresse de l\'appareil.'
      }
    },
    
    0xC7: {
      code: '0xC7',
      name: 'ENCRYPT_NULL_DESCR',
      category: 'security',
      severity: 'error',
      retryable: false,
      description: 'Encryption with null descriptor',
      cause: 'Invalid encryption descriptor',
      solution: 'Re-pair device',
      userMessage: {
        en: 'Encryption error. Re-pairing required.',
        fr: 'Erreur de chiffrement. Ré-appairage requis.'
      }
    },
    
    0xC8: {
      code: '0xC8',
      name: 'ENCRYPT_FRAME_COUNTER_FAIL',
      category: 'security',
      severity: 'error',
      retryable: false,
      description: 'Encryption frame counter failure',
      cause: 'Frame counter issue',
      solution: 'Re-pair device',
      userMessage: {
        en: 'Security synchronization lost. Re-pairing required.',
        fr: 'Synchronisation de sécurité perdue. Ré-appairage requis.'
      }
    },
    
    0xC9: {
      code: '0xC9',
      name: 'ENCRYPT_DEFAULT',
      category: 'security',
      severity: 'error',
      retryable: false,
      description: 'Default encryption error',
      cause: 'Generic encryption failure',
      solution: 'Re-pair device',
      userMessage: {
        en: 'Encryption failed. Re-pairing required.',
        fr: 'Échec du chiffrement. Ré-appairage requis.'
      }
    },
    
    0xCA: {
      code: '0xCA',
      name: 'FRAME_COUNTER_EXPIRED',
      category: 'security',
      severity: 'error',
      retryable: false,
      description: 'Frame counter expired',
      cause: 'Frame counter overflow or reset',
      solution: 'Re-pair device to reset security',
      userMessage: {
        en: 'Security expired. Re-pairing required.',
        fr: 'Sécurité expirée. Ré-appairage requis.'
      }
    }
  };
  
  /**
   * Get error information
   */
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
  
  /**
   * Check if error is retryable
   */
  static isRetryable(code) {
    const error = this.getError(code);
    return error.retryable === true;
  }
  
  /**
   * Check if error is critical
   */
  static isCritical(code) {
    const error = this.getError(code);
    return error.severity === 'critical';
  }
  
  /**
   * Get user-friendly message
   */
  static getUserMessage(code, lang = 'en') {
    const error = this.getError(code);
    return error.userMessage[lang] || error.userMessage.en;
  }
  
  /**
   * Get all errors by category
   */
  static getErrorsByCategory(category) {
    return Object.values(this.ERROR_CODES).filter(e => e.category === category);
  }
  
  /**
   * Get autofix strategy
   */
  static getAutofixStrategy(code) {
    const error = this.getError(code);
    return error.autofix || null;
  }
}

module.exports = ZigbeeErrorCodes;
