#!/usr/bin/env node
'use strict';

const fs = require('fs');

class ComprehensiveLogger {
    constructor() {
        this.logFile = 'mega-pipeline.log';
    }
    
    log(message, level = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = '[' + timestamp + '] [' + level + '] ' + message;
        
        console.log(logEntry);
        
        // Écrire dans le fichier de log
        fs.appendFileSync(this.logFile, logEntry + '\n');
    }
    
    error(message) {
        this.log(message, 'ERROR');
    }
    
    success(message) {
        this.log(message, 'SUCCESS');
    }
}

module.exports = ComprehensiveLogger;