module.exports = {
  /**
   * Fetch all devices configured in this Homey Pro.
   * Returns a lightweight array for use in settings dropdown menus.
   * Uses native Homey SDK3 APIs — no dependency on homey-api.
   */
  async getDevices({ homey }) {
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
            zoneName: device.getZone()?.getName() || '',
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
  },

  /**
   * WHY: Settings spider map (Z2M-style) for this app's Zigbee devices.
   * HOW: Passive snapshot — last-hop LQI/RSSI already on zclNode; no ZDO Mgmt_LQI.
   * WHO: MASTER_ONLY Homey settings page. Homey Pro 2023 has no app-visible route table.
   * WHEN: User opens App Settings and taps Refresh.
   * AGAINST: Active neighbor scans (mesh flood on sleepy battery nodes).
   */
  async getZigbeeMap({ homey }) {
    let ZigbeeMeshMap;
    try {
      ZigbeeMeshMap = require('./lib/features/ZigbeeMeshMap');
    } catch (err) {
      homey.error('[ZigbeeMeshMap] module missing:', err);
      throw new Error('Zigbee map module unavailable');
    }
    try {
      const app = homey.__tuyaApp;
      const snapshot = ZigbeeMeshMap.buildSnapshot(homey, {
        availabilityManager: app && app.availabilityManager,
      });
      if (app && app.networkTopologyCollector) {
        ZigbeeMeshMap.ingestCollector(app.networkTopologyCollector, snapshot);
      }
      return snapshot;
    } catch (err) {
      homey.error('[ZigbeeMeshMap] snapshot failed:', err);
      throw new Error(`Zigbee map failed: ${err.message}`);
    }
  },

  /**
   * WHY: Settings / pairing need WiFi devices currently advertising on LAN.
   * HOW: UDP cache (+ mDNS strategy) via AutonomousAdvertisingDiscovery.
   * WHO: Homey Pro user (local-first). Cloud not used.
   * WHEN: Settings refresh or pair lan_discover.
   */
  async getWifiLanMap({ homey }) {
    let hub;
    try {
      hub = require('./lib/discovery/AutonomousAdvertisingDiscovery');
    } catch (err) {
      homey.error('[WifiLanMap] module missing:', err);
      throw new Error('WiFi LAN map module unavailable');
    }
    try {
      const app = homey.__tuyaApp || homey.app;
      const udp = app && app._tuyaUDPDiscovery;
      if (udp && typeof hub.burstWifiProbe === 'function') {
        await hub.burstWifiProbe(udp, { durationMs: 4000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 1000));
      }
      const snap = hub.buildWifiLanSnapshot(homey, { udpDiscovery: udp });
      // P2411: optional TCP force (settings "deep scan")
      try {
        const { forceScanTcp6668 } = require('./lib/tuya-local/TuyaTcpForceScan');
        const tcp = await forceScanTcp6668({
          log: (...a) => homey.log?.(...a),
          concurrency: 24,
          timeoutMs: 250,
        });
        const byIp = new Map((snap.devices || []).map((d) => [d.ip, d]));
        for (const hit of tcp) {
          if (byIp.has(hit.ip)) {
            const row = byIp.get(hit.ip);
            row.source = `${row.source || 'udp'}+tcp6668`;
            row.advertising = true;
          } else {
            snap.devices.push({
              deviceId: '',
              ip: hit.ip,
              version: 'auto',
              source: 'tcp6668',
              advertising: true,
              paired: false,
              lastSeen: Date.now(),
            });
          }
        }
        snap.stats = snap.stats || {};
        snap.stats.tcpOpen = tcp.length;
        snap.stats.total = snap.devices.length;
        snap.note = (snap.note || '') + ' + TinyTuya TCP/6668 force scan.';
      } catch (_e) { /* non-fatal on constrained hosts */ }
      return snap;
    } catch (err) {
      homey.error('[WifiLanMap] snapshot failed:', err);
      throw new Error(`WiFi LAN map failed: ${err.message}`);
    }
  },

  /**
   * Search and replace old device references with new ones
   * inside triggers, conditions, and actions of all Flows and Advanced Flows.
   * Uses native Homey SDK3 ManagerFlow APIs.
   */
  async replaceDevice({ homey, body }) {
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
};
