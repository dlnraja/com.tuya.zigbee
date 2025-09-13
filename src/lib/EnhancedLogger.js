
/**
 * Enhanced Logging System
 * Professional logging for device debugging and support
 */

class EnhancedLogger {
    constructor(deviceName) {
        this.deviceName = deviceName;
        this.logLevel = process.env.DEBUG ? 'debug' : 'info';
    }
    
    deviceInfo(message, data = {}) {
        this.log('INFO', message, data);
    }
    
    deviceError(message, error = {}) {
        this.log('ERROR', message, { error: error.message, stack: error.stack });
    }
    
    deviceDebug(message, data = {}) {
        if (this.logLevel === 'debug') {
            this.log('DEBUG', message, data);
        }
    }
    
    log(level, message, data) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            device: this.deviceName,
            message,
            data
        };
        
        console.log(`[${timestamp}] [${level}] [${this.deviceName}] ${message}`, data);
    }
}

module.exports = EnhancedLogger;
