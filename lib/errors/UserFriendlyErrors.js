'use strict';

/**
 * UserFriendlyErrors - v1.0.0
 * Translates technical errors into user-friendly messages
 *
 * Features:
 * - Error categorization and mapping
 * - Context-aware suggestions
 * - Multi-language support ready
 * - Error history for pattern detection
 */
class UserFriendlyErrors {
  constructor() {
    this._errorPatterns = new Map();
    this._errorHistory = new Map(); // Track error frequency
    this._initializeErrorPatterns();
  }

  /**
   * Initialize error pattern mappings
   * @private
   */
  _initializeErrorPatterns() {
    // Connection errors
    this._errorPatterns.set(/timeout|timed?\s*out/i, {
      category: 'connection',
      title: 'Connection Timeout',
      message: 'The device is not responding. It may be out of range or powered off.',
      suggestions: [
        'Check if the device is powered on',
        'Move the device closer to your Homey hub',
        'Ensure there are Zigbee routers (plugs/switches) between the device and hub'
      ],
      severity: 'warning'
    });

    this._errorPatterns.set(/econnrefused|connection\s*refused/i, {
      category: 'connection',
      title: 'Connection Refused',
      message: 'The device is actively refusing connections.',
      suggestions: [
        'The device may need to be reset',
        'Try removing and re-adding the device',
        'Check if the device firmware is up to date'
      ],
      severity: 'error'
    });

    this._errorPatterns.set(/econnreset|connection\s*reset/i, {
      category: 'connection',
      title: 'Connection Lost',
      message: 'The connection to the device was unexpectedly interrupted.',
      suggestions: [
        'Check for interference from other wireless devices',
        'Ensure the device has stable power',
        'Try moving the device closer to a Zigbee router'
      ],
      severity: 'warning'
    });

    // Device errors
    this._errorPatterns.set(/device\s*not\s*found|not\s*paired/i, {
      category: 'device',
      title: 'Device Not Found',
      message: 'The device could not be found on the Zigbee network.',
      suggestions: [
        'The device may need to be re-paired',
        'Check if the device is powered on',
        'Try resetting the device and pairing again'
      ],
      severity: 'error'
    });

    this._errorPatterns.set(/pairing\s*failed|join\s*failed/i, {
      category: 'pairing',
      title: 'Pairing Failed',
      message: 'Could not pair with the device.',
      suggestions: [
        'Make sure the device is in pairing mode (usually indicated by a blinking light)',
        'Move the device closer to your Homey hub during pairing',
        'Reset the device to factory settings and try again',
        'Check if the device supports Zigbee 3.0'
      ],
      severity: 'error'
    });

    this._errorPatterns.set(/fingerprint\s*mismatch|no\s*matching\s*driver/i, {
      category: 'pairing',
      title: 'Device Not Recognized',
      message: 'This device type is not currently supported.',
      suggestions: [
        'Check for app updates that may include support for this device',
        'Try using a compatible device driver if available',
        'Report this device model to help us add support'
      ],
      severity: 'info'
    });

    // Command errors
    this._errorPatterns.set(/command\s*failed|send\s*failed/i, {
      category: 'command',
      title: 'Command Failed',
      message: 'The command could not be sent to the device.',
      suggestions: [
        'The device may be temporarily unavailable',
        'Check the Zigbee mesh network health',
        'Try the command again in a few moments'
      ],
      severity: 'warning'
    });

    this._errorPatterns.set(/delivery\s*failed|route\s*error/i, {
      category: 'network',
      title: 'Message Delivery Failed',
      message: 'The message could not be delivered through the Zigbee network.',
      suggestions: [
        'The Zigbee mesh may need time to heal',
        'Add more Zigbee routers (plugs, switches) to improve coverage',
        'Check for sources of wireless interference'
      ],
      severity: 'warning'
    });

    // Battery errors
    this._errorPatterns.set(/battery\s*(low|critical|empty)/i, {
      category: 'battery',
      title: 'Battery Warning',
      message: 'The device battery is low and needs attention.',
      suggestions: [
        'Replace the battery soon to avoid device going offline',
        'Use the recommended battery type for best performance',
        'Check for firmware updates that may improve battery life'
      ],
      severity: 'warning'
    });

    // Firmware errors
    this._errorPatterns.set(/firmware|ota|update\s*failed/i, {
      category: 'firmware',
      title: 'Firmware Update Issue',
      message: 'There was a problem with a firmware update.',
      suggestions: [
        'Ensure the device has stable power during updates',
        'Keep the device close to the hub during firmware updates',
        'Try the update again later'
      ],
      severity: 'warning'
    });

    // Configuration errors
    this._errorPatterns.set(/invalid\s*(setting|config|parameter)/i, {
      category: 'configuration',
      title: 'Invalid Configuration',
      message: 'One or more settings are invalid.',
      suggestions: [
        'Check that all values are within the allowed range',
        'Reset to default settings if unsure',
        'Refer to the device documentation for valid values'
      ],
      severity: 'error'
    });

    // Generic fallback
    this._errorPatterns.set(/error|fail|exception/i, {
      category: 'generic',
      title: 'Something Went Wrong',
      message: 'An unexpected error occurred.',
      suggestions: [
        'Try the operation again',
        'Restart the device',
        'Check for app updates'
      ],
      severity: 'error'
    });
  }

  /**
   * Translate a technical error to user-friendly format
   * @param {Error|string} error - The error to translate
   * @param {Object} context - Additional context
   * @param {string} context.deviceName - Name of the device
   * @param {string} context.operation - What was being attempted
   * @returns {Object} User-friendly error info
   */
  translate(error, context = {}) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';

    // Find matching pattern
    let matchedPattern = null;
    for (const [pattern, info] of this._errorPatterns) {
      if (pattern.test(errorMessage)) {
        matchedPattern = info;
        break;
      }
    }

    // Default if no match
    if (!matchedPattern) {
      matchedPattern = {
        category: 'unknown',
        title: 'Unexpected Error',
        message: 'An error occurred while communicating with the device.',
        suggestions: [
          'Try the operation again',
          'Check if the device is powered and in range',
          'Restart the device if possible'
        ],
        severity: 'error'
      };
    }

    // Build user-friendly response
    const result = {
      title: matchedPattern.title,
      message: this._personalizeMessage(matchedPattern.message, context),
      suggestions: matchedPattern.suggestions,
      severity: matchedPattern.severity,
      category: matchedPattern.category,
      technical: this._shouldShowTechnical(errorStack) ? errorMessage : undefined,
      context: {
        deviceName: context.deviceName || 'Unknown Device',
        operation: context.operation || 'Unknown Operation',
        timestamp: Date.now()
      }
    };

    // Track error for pattern detection
    this._trackError(matchedPattern.category, errorMessage);

    return result;
  }

  /**
   * Personalize message with context
   * @private
   */
  _personalizeMessage(message, context) {
    let personalized = message;

    if (context.deviceName) {
      personalized = personalized.replace(/the device/gi, context.deviceName);
    }

    if (context.operation) {
      personalized = `${context.operation}: ${personalized}`;
    }

    return personalized;
  }

  /**
   * Determine if technical details should be shown
   * @private
   */
  _shouldShowTechnical(errorStack) {
    // In production, hide technical details unless debugging
    // This could be tied to a debug mode setting
    return false;
  }

  /**
   * Track error occurrence for pattern detection
   * @private
   */
  _trackError(category, message) {
    const key = `${category}:${message.substring(0, 50)}`;
    const count = (this._errorHistory.get(key) || 0) + 1;
    this._errorHistory.set(key, count);

    // Clean up old entries (keep last 1000)
    if (this._errorHistory.size > 1000) {
      const firstKey = this._errorHistory.keys().next().value;
      this._errorHistory.delete(firstKey);
    }
  }

  /**
   * Get error statistics for diagnostics
   * @returns {Object} Error statistics
   */
  getErrorStats() {
    const stats = {
      total: 0,
      byCategory: {},
      frequent: []
    };

    for (const [key, count] of this._errorHistory) {
      const [category] = key.split(':');
      stats.total += count;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + count;
    }

    // Find most frequent errors
    const sorted = [...this._errorHistory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    stats.frequent = sorted.map(([key, count]) => {
      const [category, message] = key.split(':');
      return { category, message, count };
    });

    return stats;
  }

  /**
   * Get suggestions for a specific error category
   * @param {string} category - Error category
   * @returns {string[]} Array of suggestions
   */
  getSuggestionsForCategory(category) {
    for (const [, info] of this._errorPatterns) {
      if (info.category === category) {
        return info.suggestions;
      }
    }
    return ['Try the operation again', 'Check device connectivity'];
  }

  /**
   * Create a quick error for common scenarios
   * @param {string} type - Error type
   * @param {Object} context - Additional context
   * @returns {Object} User-friendly error
   */
  quick(type, context = {}) {
    const quickErrors = {
      'device-offline': {
        title: 'Device Offline',
        message: `${context.deviceName || 'The device'} is currently not responding.`,
        suggestions: [
          'Check if the device is powered on',
          'The device may need to be re-paired'
        ],
        severity: 'warning'
      },
      'command-timeout': {
        title: 'Command Timeout',
        message: `The command to ${context.deviceName || 'the device'} timed out.`,
        suggestions: [
          'The device may be busy or out of range',
          'Try again in a few moments'
        ],
        severity: 'warning'
      },
      'battery-low': {
        title: 'Low Battery',
        message: `${context.deviceName || 'The device'} battery is low.`,
        suggestions: [
          'Replace the battery soon',
          'Use recommended battery type'
        ],
        severity: 'warning'
      },
      'mesh-weak': {
        title: 'Weak Zigbee Signal',
        message: 'The Zigbee connection is weak.',
        suggestions: [
          'Add a Zigbee router (smart plug) nearby',
          'Move the device closer to the hub'
        ],
        severity: 'info'
      }
    };

    const error = quickErrors[type] || quickErrors['device-offline'];
    return {
      ...error,
      category: type,
      context: {
        deviceName: context.deviceName || 'Unknown',
        operation: context.operation || 'Operation',
        timestamp: Date.now()
      }
    };
  }
}

module.exports = UserFriendlyErrors;
