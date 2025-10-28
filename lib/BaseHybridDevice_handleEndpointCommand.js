// Snippet à ajouter à BaseHybridDevice.js après la méthode requestBatteryUpdate()

  /**
   * Handle commands from any endpoint
   * Override in child classes for custom handling
   * @param {number} epId - Endpoint ID
   * @param {string} clusterName - Cluster name
   * @param {string} command - Command name
   * @param {Object} payload - Command payload
   */
  handleEndpointCommand(epId, clusterName, command, payload) {
    this.log(`[CMD] EP${epId} ${clusterName}.${command}`, payload);
    
    // Default handling for common commands
    // Child classes should override for device-specific logic
    
    if (clusterName === 'onOff') {
      this.log(`[CMD] EP${epId} OnOff command: ${command}`);
      // Handled by registerCapability in most cases
    }
    
    if (clusterName === 'scenes' && command === 'recall') {
      const sceneId = payload?.sceneId || 0;
      this.log(`[CMD] EP${epId} Scene recalled: ${sceneId}`);
      // For button devices - handled by ButtonDevice
    }
    
    if (clusterName === 'levelControl') {
      this.log(`[CMD] EP${epId} Level control: ${command}`, payload);
      // For dimmer devices
    }
  }

  /**
   * Cleanup on device deletion
   */
  async onDeleted() {
    this.log('BaseHybridDevice cleanup...');
    
    try {
      // Cleanup managers
      if (this.commandListener) {
        this.commandListener.cleanup();
      }
      
      if (this.tuyaEF00Manager) {
        this.tuyaEF00Manager.cleanup();
      }
      
      // Clear any timers
      if (this._batteryCheckInterval) {
        clearInterval(this._batteryCheckInterval);
      }
      
      this.log('✅ Cleanup complete');
    } catch (err) {
      this.error('Cleanup error:', err.message);
    }
  }
