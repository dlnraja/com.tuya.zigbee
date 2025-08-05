#!/usr/bin/env node

/**
 * 📝 LOGGER.JS
 * Logger standardisé multilingue
 */

class MultilingualLogger {
    constructor() {
        this.languages = ['en', 'fr', 'nl', 'ta'];
    }
    
    log(message, level = 'info', language = 'en') {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level.toUpperCase()}] [${language}] ${message}`);
    }
}

module.exports = MultilingualLogger;
