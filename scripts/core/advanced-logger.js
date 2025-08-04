#!/usr/bin/env node

/**
 * 📝 ADVANCED LOGGER
 * 📅 Date: 2025-08-04
 * 🎯 Mode: YOLO ADVANCED LOGGING
 * 📦 Système de logs avancé pour tuya-light
 */

const fs = require('fs');
const path = require('path');

class AdvancedLogger {
    constructor() {
        this.projectRoot = process.cwd();
        this.logLevels = {
            DEBUG: 0,
            INFO: 1,
            WARN: 2,
            ERROR: 3,
            FATAL: 4
        };
        this.currentLevel = this.logLevels.INFO;
        this.logFile = path.join(this.projectRoot, 'logs', 'tuya-light.log');
        this.ensureLogDirectory();
    }
    
    ensureLogDirectory() {
        const logDir = path.dirname(this.logFile);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    }
    
    log(level, message, data = null) {
        if (this.logLevels[level] >= this.currentLevel) {
            const timestamp = new Date().toISOString();
            const logEntry = {
                timestamp,
                level,
                message,
                data
            };
            
            // Console output
            const consoleMessage = `[${timestamp}] [${level}] ${message}`;
            console.log(consoleMessage);
            
            // File output
            const fileMessage = JSON.stringify(logEntry) + '\n';
            fs.appendFileSync(this.logFile, fileMessage);
        }
    }
    
    debug(message, data = null) {
        this.log('DEBUG', message, data);
    }
    
    info(message, data = null) {
        this.log('INFO', message, data);
    }
    
    warn(message, data = null) {
        this.log('WARN', message, data);
    }
    
    error(message, data = null) {
        this.log('ERROR', message, data);
    }
    
    fatal(message, data = null) {
        this.log('FATAL', message, data);
    }
    
    setLogLevel(level) {
        if (this.logLevels[level] !== undefined) {
            this.currentLevel = this.logLevels[level];
        }
    }
    
    getLogs(limit = 100) {
        if (fs.existsSync(this.logFile)) {
            const content = fs.readFileSync(this.logFile, 'utf8');
            const lines = content.trim().split('\n');
            return lines.slice(-limit).map(line => JSON.parse(line));
        }
        return [];
    }
}

module.exports = AdvancedLogger;
