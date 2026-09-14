'use strict';

/**
 * P2487 — Homey pair/repair session handlers for shared IR wizard HTML.
 */
const IRCodeLibrary = require('./IRCodeLibrary');
const { getRouter, HOMEY_IR_SENDER_ID } = require('./IntelligentIRRouter');

function registerIrWizardHandlers(session, { homey, device = null, log = console.log }) {
  const router = getRouter(homey);

  const resolveSender = (data = {}) => {
    if (data.senderId === HOMEY_IR_SENDER_ID || data.transport_driver === HOMEY_IR_SENDER_ID) {
      return router.findSender(HOMEY_IR_SENDER_ID);
    }
    if (device && device.driver?.id !== 'ir_remote') {
      return {
        device,
        id: (device.getData && device.getData().id) || null,
        driverId: device.driver?.id || null,
        transport: (device.driver?.id === 'wifi_ir_remote') ? 'wifi' : 'zigbee',
      };
    }
    const sid = data.senderId;
    const sender = router.findSender(sid)
      || router.listSenders().find((s) => s.driverId === data.driverId && s.id === sid);
    return sender || null;
  };

  session.setHandler('list_senders', async () => router.listSenders().map((s) => ({
    id: s.id,
    driverId: s.driverId,
    name: s.name,
    transport: s.transport,
    learnSupported: s.learnSupported !== false,
  })));

  session.setHandler('list_codes', async (data) => {
    const sender = resolveSender(data);
    const store = (sender && sender.transport === 'homey') ? device : (sender && sender.device) || device;
    if (!store) return [];
    const map = await router.getLearnedMap(store);
    return Object.keys(map).map((name) => ({ name, format: map[name].format || null }));
  });

  session.setHandler('rename_code', async (data) => {
    const sender = resolveSender(data);
    const store = (sender && sender.transport === 'homey') ? device : (sender && sender.device) || device;
    if (!store) throw new Error('No device store');
    return router.renameCode(store, data.from, data.to);
  });

  session.setHandler('delete_code', async (data) => {
    const sender = resolveSender(data);
    const store = (sender && sender.transport === 'homey') ? device : (sender && sender.device) || device;
    if (!store) throw new Error('No device store');
    return router.deleteCode(store, data.name);
  });

  session.setHandler('get_brands', async (data) => IRCodeLibrary.getBrands(data?.category));

  session.setHandler('test_ir_code', async (data) => {
    const sender = resolveSender(data);
    if (!sender) throw new Error('IR sender not found');
    if (sender.transport === 'homey') {
      await router.send({
        senderId: HOMEY_IR_SENDER_ID,
        storeDevice: device,
        brand: data.brand || 'Samsung',
        category: data.category || 'TV',
        command: data.command || 'Power',
      });
      return true;
    }
    if (!sender.device) throw new Error('IR sender not found');
    await router.send({
      device: sender.device,
      brand: data.brand || 'Samsung',
      category: data.category || 'TV',
      command: data.command || 'Power',
    });
    return true;
  });

  session.setHandler('store_manual_ir', async (data) => {
    const sender = resolveSender(data);
    if (!sender) throw new Error('IR sender not found');
    if (sender.transport === 'homey') {
      if (!device) throw new Error('Homey IR paste needs virtual remote device store');
      return router.storeManual({
        senderId: HOMEY_IR_SENDER_ID,
        storeDevice: device,
        device,
        name: data.name || 'manual',
        input: data.code,
        format: data.format || 'auto',
        sendAfter: !!data.sendAfter,
      });
    }
    if (!sender.device) throw new Error('IR sender not found');
    return router.storeManual({
      device: sender.device,
      name: data.name || 'manual',
      input: data.code,
      format: data.format || 'auto',
      sendAfter: !!data.sendAfter,
    });
  });

  session.setHandler('start_learn', async (data) => {
    const sender = resolveSender(data);
    if (!sender) throw new Error('IR sender not found');
    if (sender.transport === 'homey' || sender.learnSupported === false) {
      throw new Error('Homey onboard IR is TX-only — learn via Zigbee/WiFi blaster');
    }
    if (!sender.device) throw new Error('IR sender not found');
    return router.learn({
      device: sender.device,
      name: data.name || 'learned',
      timeout: data.timeout || 30,
      confirm: data.confirm !== false,
    });
  });

  session.setHandler('save_ir_config', async (data) => {
    const target = device;
    if (!target || typeof target.setSettings !== 'function') {
      log('[IR-WIZARD] save_ir_config without device — pair virtual uses list settings');
      return data || {};
    }
    const patch = {};
    if (data.ir_brand) patch.ir_brand = data.ir_brand;
    if (data.ir_category) patch.ir_category = data.ir_category;
    if (data.transport_id) patch.transport_id = data.transport_id;
    if (data.blaster_id) patch.blaster_id = data.blaster_id;
    if (data.transport_driver) patch.transport_driver = data.transport_driver;
    await target.setSettings(patch);
    return true;
  });
}

module.exports = { registerIrWizardHandlers };
