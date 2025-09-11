// Device pattern database
module.exports = [
  {
    match: device => device.modelId.includes('TS011F') && device.manufacturerName.includes('Tuya'),
    capabilities: ['onoff', 'dim'],
    settings: {
      powerOnState: { type: 'string' }
    },
    label: 'Tuya Smart Plug'
  },
  // ... other patterns
];
