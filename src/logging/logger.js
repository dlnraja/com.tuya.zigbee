const fs = require('fs');
const path = require('path');

class Logger {
  constructor(logFile = 'app.log') {
    this.logFile = path.join(__dirname, '..', '..', 'logs', logFile);
    this.ensureLogDir();
  }
  
  ensureLogDir() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }
  
  log(level, message, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      message,
      data
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(this.logFile, logLine);
    
    // Afficher dans la console
    console.log(`[${logEntry.level}] ${logEntry.message}`);
  }
  
  info(message, data) { this.log('info', message, data); }
  warn(message, data) { this.log('warn', message, data); }
  error(message, data) { this.log('error', message, data); }
  debug(message, data) { this.log('debug', message, data); }
}

module.exports = Logger;