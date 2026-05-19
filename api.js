const { HomeyAPI } = require('homey-api');

module.exports = {
  /**
   * Fetch all devices configured in this Homey Pro.
   * Returns a lightweight array for use in settings dropdown menus.
   */
  async getDevices({ homey }) {
    try {
      const api = await HomeyAPI.createAppAPI({ homey });
      const devices = await api.devices.getDevices();
      return Object.values(devices)
        .map(d => ({
          id: d.id,
          name: d.name,
          zoneName: d.zoneName || '',
          driverId: d.driverId || '',
          driverUri: d.driverUri || ''
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      homey.error('[FlowRepair API] Failed to fetch devices:', err);
      throw new Error(`Failed to retrieve devices: ${err.message}`);
    }
  },

  /**
   * Search and replace old device references with new ones
   * inside triggers, conditions, and actions of all Flows and Advanced Flows.
   */
  async replaceDevice({ homey, body }) {
    const { oldId, newId } = body;
    if (!oldId || !newId) {
      throw new Error('Both oldId and newId are required parameters.');
    }

    try {
      const api = await HomeyAPI.createAppAPI({ homey });
      
      let flowsUpdated = 0;
      let advancedFlowsUpdated = 0;

      // 1. Process Standard Flows
      const flows = await api.flow.getFlows();
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
          await api.flow.updateFlow({
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
      const advancedFlows = await api.flow.getAdvancedFlows();
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
          await api.flow.updateAdvancedFlow({
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
};
