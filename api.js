module.exports = [
  {
    method: 'GET',
    path: '/devices',
    public: true,
    fn: async function({ homey }) {
      try {
        const driverList = homey.drivers.getDrivers();
        const allDevices = [];

        for (const driverId of Object.keys(driverList)) {
          const driver = driverList[driverId];
          const devices = driver.getDevices();
          for (const device of Object.values(devices)) {
            allDevices.push({
              id: device.getId(),
              name: device.getName(),
              driverId: device.getDriver().getId() || '',
              driverUri: device.getDriver().getUri() || ''
            });
          }
        }

        return allDevices.sort((a, b) => a.name.localeCompare(b.name));
      } catch (err) {
        homey.error('[FlowRepair API] Failed to fetch devices:', err);
        throw new Error(`Failed to retrieve devices: ${err.message}`);
      }
    }
  },
  {
    method: 'POST',
    path: '/replace',
    public: true,
    fn: async function({ homey, body }) {
      const { oldId, newId } = body;
      if (!oldId || !newId) {
        throw new Error('Both oldId and newId are required parameters.');
      }

      try {
        const flowManager = homey.flow;
        let flowsUpdated = 0;
        let advancedFlowsUpdated = 0;

        // 1. Process Standard Flows
        const flows = await flowManager.getFlows();
        for (const flow of Object.values(flows)) {
          let updated = false;

          // Triggers
          if (flow.trigger && flow.trigger.uri) {
            const replaceTrigger = flow.trigger.uri.replace('homey:device:', '');
            if (replaceTrigger === oldId) {
              flow.trigger.uri = `homey:device:${newId}`;
              updated = true;
            }
          }

          // Actions
          if (Array.isArray(flow.actions)) {
            for (let i = 0; i < flow.actions.length; i++) {
              const action = flow.actions[i];
              if (action.uri) {
                const replaceAction = action.uri.replace('homey:device:', '');
                if (replaceAction === oldId) {
                  flow.actions[i].uri = `homey:device:${newId}`;
                  updated = true;
                }
              }
            }
          }

          // Conditions
          if (Array.isArray(flow.conditions)) {
            for (let i = 0; i < flow.conditions.length; i++) {
              const condition = flow.conditions[i];
              if (condition.uri) {
                const replaceCondition = condition.uri.replace('homey:device:', '');
                if (replaceCondition === oldId) {
                  flow.conditions[i].uri = `homey:device:${newId}`;
                  updated = true;
                }
              }
            }
          }

          if (updated) {
            await flowManager.updateFlow({
              id: flow.id,
              flow: {
                trigger: flow.trigger,
                actions: flow.actions,
                conditions: flow.conditions
              }
            });
            flowsUpdated++;
          }
        }

        // 2. Process Advanced Flows
        let advancedFlows;
        try {
          advancedFlows = await flowManager.getAdvancedFlows();
        } catch (e) {
          // getAdvancedFlows might not be available on older SDK versions
          advancedFlows = {};
        }

        for (const af of Object.values(advancedFlows)) {
          let updated = false;
          const cards = af.cards;
          
          for (const cardId in cards) {
            const card = cards[cardId];
            if (card.ownerUri) {
              const replaceId = card.ownerUri.replace('homey:device:', '');
              if (replaceId === oldId) {
                card.ownerUri = `homey:device:${newId}`;
                updated = true;
              }
            }
          }

          if (updated) {
            await flowManager.updateAdvancedFlow({
              id: af.id,
              advancedflow: { cards }
            });
            advancedFlowsUpdated++;
          }
        }

        homey.log(`[FlowRepair API] Successfully migrated ${flowsUpdated} standard flows and ${advancedFlowsUpdated} advanced flows from ${oldId} to ${newId}.`);

        return {
          success: true,
          flowsUpdated,
          advancedFlowsUpdated
        };
      } catch (err) {
        homey.error('[FlowRepair API] Replacement failed:', err);
        throw new Error(`Device replacement failed: ${err.message}`);
      }
    }
  },
  {
    method: 'GET',
    path: '/diagnostics/:id',
    public: true,
    fn: async function({ homey, params }) {
      try {
        const deviceId = params.id;
        const driverList = homey.drivers.getDrivers();
        let targetDevice = null;
        
        for (const driverId of Object.keys(driverList)) {
          const devices = driverList[driverId].getDevices();
          if (devices[deviceId]) {
            targetDevice = devices[deviceId];
            break;
          }
        }

        if (!targetDevice) throw new Error('Device not found');

        const diagDump = {
          timestamp: new Date().toISOString(),
          id: targetDevice.getId(),
          name: targetDevice.getName(),
          driver: targetDevice.getDriver().getId(),
          data: targetDevice.getData(),
          store: targetDevice.getStore(),
          settings: targetDevice.getSettings(),
          capabilities: targetDevice.getCapabilities(),
          zclNodeData: targetDevice.zclNode ? {
            endpoints: Object.keys(targetDevice.zclNode.endpoints || {}),
          } : null
        };

        if (typeof targetDevice.runDiagnostics === 'function') {
           diagDump.runtimeDiagnostics = await targetDevice.runDiagnostics();
        }

        return diagDump;
      } catch (err) {
        homey.error('[Diagnostics API] Error:', err);
        throw new Error(`Diagnostics failed: ${err.message}`);
      }
    }
  },
  {
    method: 'GET',
    path: '/drivers',
    public: true,
    fn: async function({ homey }) {
      try {
        const drivers = [];
        if (homey.manifest && homey.manifest.drivers) {
          for (const d of homey.manifest.drivers) {
            drivers.push({
              id: d.id,
              name: d.name.en || d.name
            });
          }
        }
        return drivers.sort((a, b) => a.name.localeCompare(b.name));
      } catch (err) {
        homey.error('[Drivers API] Error:', err);
        throw new Error(`Failed to fetch drivers: ${err.message}`);
      }
    }
  }
];
