'use strict';

/**
 * MultiEndpointCommandListener - Listen for commands on ALL endpoints
 * 
 * Critical for multi-gang devices (USB 2-port, 2-gang switches, etc.)
 * Ensures we capture events from ALL endpoints, not just endpoint 1
 */

class MultiEndpointCommandListener {
  
  constructor(device) {
    this.device = device;
    this.listeners = new Map(); // Track listeners for cleanup
  }

  /**
   * Setup command listeners on all endpoints
   * @param {ZCLNode} zclNode
   * @param {Object} options
   * @param {Array} options.clusters - Clusters to listen to (default: ['onOff', 'levelControl', 'scenes'])
   * @param {Function} options.onCommand - Callback when command received: (epId, clusterName, command, payload) => {}
   */
  async setupListeners(zclNode, options = {}) {
    if (!zclNode) {
      this.device.error('[CMD-LISTENER] zclNode not available');
      return false;
    }

    const {
      clusters = ['onOff', 'levelControl', 'scenes'],
      onCommand = null
    } = options;

    this.device.log(`[CMD-LISTENER] 🎧 Setting up command listeners on all endpoints...`);
    this.device.log(`[CMD-LISTENER] Monitoring clusters:`, clusters.join(', '));

    let listenerCount = 0;

    // Iterate through ALL endpoints
    for (const [epId, endpoint] of Object.entries(zclNode.endpoints || {})) {
      this.device.log(`[CMD-LISTENER] Checking endpoint ${epId}...`);

      // For each cluster type
      for (const clusterName of clusters) {
        const cluster = endpoint.clusters?.[clusterName];
        
        if (!cluster) {
          this.device.log(`[CMD-LISTENER]   - ${clusterName}: not present`);
          continue;
        }

        try {
          // Bind cluster to coordinator (required for receiving commands)
          try {
            await cluster.bind('coordinator');
            this.device.log(`[CMD-LISTENER]   - ${clusterName}: ✅ bound`);
          } catch (bindErr) {
            this.device.log(`[CMD-LISTENER]   - ${clusterName}: bind failed (${bindErr.message})`);
          }

          // Listen for commands
          const commandListener = (commandName, commandPayload) => {
            this.device.log(`[CMD-LISTENER] 📥 EP${epId} ${clusterName}.${commandName}`, commandPayload);
            
            // Call custom handler if provided
            if (onCommand) {
              onCommand(parseInt(epId), clusterName, commandName, commandPayload);
            }
          };

          cluster.on('command', commandListener);
          this.listeners.set(`${epId}_${clusterName}_command`, { cluster, listener: commandListener, event: 'command' });
          listenerCount++;
          
          this.device.log(`[CMD-LISTENER]   - ${clusterName}: ✅ command listener active`);

          // Also listen for attribute reports (useful for switches)
          const attrListener = (attrName, value) => {
            this.device.log(`[CMD-LISTENER] 📊 EP${epId} ${clusterName}.${attrName} = ${value}`);
          };

          cluster.on('attr.report', attrListener);
          this.listeners.set(`${epId}_${clusterName}_attr`, { cluster, listener: attrListener, event: 'attr.report' });
          listenerCount++;

          this.device.log(`[CMD-LISTENER]   - ${clusterName}: ✅ attr listener active`);

          // Configure reporting if possible
          if (clusterName === 'onOff') {
            try {
              await cluster.configureReporting('onOff', 0, 300, 1);
              this.device.log(`[CMD-LISTENER]   - ${clusterName}: ✅ reporting configured`);
            } catch (reportErr) {
              this.device.log(`[CMD-LISTENER]   - ${clusterName}: reporting failed (${reportErr.message})`);
            }
          }

        } catch (err) {
          this.device.error(`[CMD-LISTENER]   - ${clusterName}: ❌ setup failed:`, err.message);
        }
      }
    }

    this.device.log(`[CMD-LISTENER] ✅ Setup complete - ${listenerCount} listeners active`);
    return listenerCount > 0;
  }

  /**
   * Cleanup all listeners
   */
  cleanup() {
    this.device.log(`[CMD-LISTENER] 🧹 Cleaning up ${this.listeners.size} listeners...`);
    
    for (const [key, { cluster, listener, event }] of this.listeners.entries()) {
      try {
        cluster.removeListener(event, listener);
      } catch (err) {
        this.device.error(`[CMD-LISTENER] Failed to remove listener ${key}:`, err.message);
      }
    }
    
    this.listeners.clear();
    this.device.log(`[CMD-LISTENER] ✅ Cleanup complete`);
  }
}

module.exports = MultiEndpointCommandListener;
