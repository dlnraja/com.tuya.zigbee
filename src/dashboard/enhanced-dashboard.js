const fs = require('fs');
const path = require('path');

class EnhancedDashboard {
  constructor() {
    this.data = {};
    this.themes = ['light', 'dark'];
    this.currentTheme = 'light';
  }
  
  setTheme(theme) {
    if (this.themes.includes(theme)) {
      this.currentTheme = theme;
      return true;
    }
    return false;
  }
  
  addWidget(widgetName, widgetData) {
    this.data[widgetName] = widgetData;
  }
  
  getDashboardData() {
    return {
      theme: this.currentTheme,
      widgets: this.data,
      timestamp: Date.now()
    };
  }
}

module.exports = EnhancedDashboard;