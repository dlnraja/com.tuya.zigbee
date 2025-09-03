const { test } = require('tap');
const NLPIntegration = require('../lib/nlpIntegration');

// Mock Homey app
const mockApp = {
  homey: {
    devices: {
      getDevices: () => [
        { name: 'Living Room Light', capabilities: ['onoff'], class: 'light' },
        { name: 'Thermostat', capabilities: ['measure_temperature'], class: 'thermostat' },
      ],
    },
  },
};

test('NLPIntegration should process query', async (t) => {
  const nlp = new NLPIntegration(mockApp);
  await nlp.init();
  
  const result = await nlp.processQuery('Turn on the light in the living room');
  t.same(result, [
    { name: 'Living Room Light', capabilities: ['onoff'], class: 'light' },
  ]);
});
