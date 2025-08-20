const fs = require('fs');
const path = require('path');

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.pluginsDir = path.join(__dirname);
  }
  
  loadPlugin(pluginName) {
    try {
      const pluginPath = path.join(this.pluginsDir, `${pluginName}.js`);
      if (fs.existsSync(pluginPath)) {
        const plugin = require(pluginPath);
        this.plugins.set(pluginName, plugin);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Erreur lors du chargement du plugin ${pluginName}:`, error);
      return false;
    }
  }
  
  getPlugin(pluginName) {
    return this.plugins.get(pluginName);
  }
  
  listPlugins() {
    return Array.from(this.plugins.keys());
  }
}

module.exports = PluginManager;