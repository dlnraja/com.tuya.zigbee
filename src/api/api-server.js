const express = require('express');
const app = express();

class APIServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = app;
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }
  
  setupRoutes() {
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'OK', timestamp: Date.now() });
    });
    
    this.app.get('/api/version', (req, res) => {
      res.json({ version: '3.7.0', name: 'Tuya Zigbee Drivers' });
    });
  }
  
  start() {
    this.app.listen(this.port, () => {
      console.log(`API Server démarré sur le port ${this.port}`);
    });
  }
}

module.exports = APIServer;