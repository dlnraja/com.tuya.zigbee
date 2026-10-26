'use strict';
// P2964 — good/bad fixtures for tools/ci/homey-sdk-rules.js (one bad case per rule).

function goodApp() {
  return {
    id: 'com.example.good',
    version: '1.2.3',
    compatibility: '>=12.5.0',
    sdk: 3,
    platforms: ['local'],
    support: 'mailto:user@example.com',
    name: { en: 'Good' },
    author: { name: 'Dev' },
    category: 'tools',
    brandColor: '#1F4E79',
    permissions: [],
    images: { small: '/assets/images/small.png', large: '/assets/images/large.png' },
    capabilities: { my_mode: { type: 'enum', title: { en: 'Mode' } } },
    discovery: { lan: { type: 'mdns-sd' } },
    drivers: [{
      id: 'plug',
      name: { en: 'Plug' },
      class: 'socket',
      platforms: ['local'],
      connectivity: ['zigbee'],
      capabilities: ['onoff', 'measure_battery', 'my_mode', 'onoff.button1'],
      capabilitiesOptions: { onoff: { title: { en: 'Power' } } },
      energy: { batteries: ['CR2032'], approximation: { usageOn: 1, usageOff: 0 } },
      images: { small: '/drivers/plug/assets/images/small.png', large: '/drivers/plug/assets/images/large.png' },
      settings: [{ id: 'interval', type: 'number', label: { en: 'Interval' } }, { type: 'group', label: { en: 'G' }, children: [{ id: 'mode', type: 'dropdown', label: { en: 'M' } }] }],
      zigbee: { manufacturerName: ['_TZ3000_abc', '_TZ3000_pad '], productId: ['TS011F'], endpoints: { 1: { clusters: [0, 6], bindings: [6] } } },
    }],
    flow: {
      triggers: [{ id: 't1', title: { en: 'T' }, tokens: [{ name: 'v', type: 'number', title: { en: 'V' } }], args: [{ type: 'device', name: 'device', filter: 'driver_id=plug' }] }],
      conditions: [],
      actions: [{ id: 'a1', title: { en: 'Set' }, titleFormatted: { en: 'Set to [[level]]', fr: 'Régler à [[level]]' }, args: [{ type: 'device', name: 'device', filter: 'driver_id=plug' }, { type: 'number', name: 'level', title: { en: 'Level' } }] }],
    },
  };
}

const d0 = (a) => a.drivers[0];
const act = (a) => a.flow.actions[0];

// mutate(app, files) -> files is a {relativePath: content} map written into a temp root
const BAD = {
  'SDK-M01': (a) => { a.id = 'nodots'; },
  'SDK-M02': (a) => { a.version = '1.2.3-rc.1'; },
  'SDK-M03': (a) => { a.compatibility = '>=3.0.0'; },
  'SDK-M04': (a) => { a.sdk = 2; },
  'SDK-M05': (a) => { a.category = 'games'; },
  'SDK-M06': (a) => { a.brandColor = '#FFFFF0'; },
  'SDK-M07': (a) => { a.images.small = '/assets/images/small.gif'; },
  'SDK-M08': (a) => { a.permissions = ['homey:app:com.athom.homeyscript']; },
  'SDK-M09': (a) => { a.permissions = ['homey:manager:speech-input']; },
  'SDK-M10': (a) => { a.platforms = ['local', 'mars']; },
  'SDK-M11': (a) => { delete a.support; },
  'SDK-M12': (a) => { a.name = { fr: 'Bon' }; },
  'SDK-M13': (a, f) => { f['locales/xx.json'] = '{}'; },
  'SDK-M14': (a) => { a.compatibility = '>=12.2.0'; delete d0(a).capabilitiesOptions; a.flow.actions = []; d0(a).capabilitiesOptions = { onoff: { uiState: {} } }; },
  'SDK-M15': (a, f) => { f['env.json'] = '{"lower": "x"}'; },
  'SDK-M16': (a) => { a.images.xlarge = '/assets/images/missing-xlarge.png'; },
  'SDK-C01': (a) => { a.capabilities['my.dot'] = { type: 'boolean' }; },
  'SDK-D01': (a) => { a.compatibility = '>=12.2.0'; a.flow.actions = []; d0(a).class = 'pump'; },
  'SDK-D02': (a) => { d0(a).capabilities.push('not_a_capability'); },
  'SDK-D03': (a) => { delete d0(a).energy.batteries; },
  'SDK-D04': (a) => { d0(a).energy.batteries = ['D-CELL-XL']; },
  'SDK-D05': (a) => { d0(a).energy.cumulativeImportedCapability = 'measure_power'; },
  'SDK-D06': (a) => { d0(a).energy.approximation.usageOn = -5; },
  'SDK-D07': (a) => { delete d0(a).images.large; },
  'SDK-D08': (a) => { d0(a).id = 'ghost'; a.flow = { triggers: [], conditions: [], actions: [] }; },
  'SDK-D09': (a) => { d0(a).capabilitiesOptions.onoff = 'nope'; },
  'SDK-D10': (a) => { d0(a).capabilitiesOptions.dim = {}; },
  'SDK-D11': (a) => { d0(a).settings.push({ id: 'x', type: 'colorwheel' }); },
  'SDK-D12': (a) => { d0(a).settings.push({ id: 'zb_poll', type: 'number' }); },
  'SDK-D13': (a) => { d0(a).settings[1].children.push({ id: 'interval', type: 'number' }); },
  'SDK-D14': (a) => { d0(a).platforms = ['local', 'cloud']; },
  'SDK-D15': (a) => { delete d0(a).connectivity; },
  'SDK-D16': (a) => { d0(a).zigbee.manufacturerName = ['_TZ3000_abc', '']; },
  'SDK-D17': (a) => { d0(a).zigbee.manufacturerName.push('_TZ3000_abc'); },
  'SDK-D18': (a) => { d0(a).discovery = 'nowhere'; },
  'SDK-D19': (a) => { a.drivers.push(JSON.parse(JSON.stringify(d0(a)))); },
  'SDK-D20': (a) => { d0(a).images.xlarge = '/drivers/plug/assets/images/nope.png'; },
  'SDK-D21': (a) => { d0(a).zigbee.manufacturerName = []; },
  'SDK-F01': (a) => { a.flow.actions.push(JSON.parse(JSON.stringify(act(a)))); },
  'SDK-F02': (a) => { act(a).titleFormatted = { en: 'Set to [[level]] [[level]]' }; },
  'SDK-F03': (a) => { act(a).titleFormatted = { en: 'Set to {level} [[level]]' }; },
  'SDK-F04': (a) => { delete act(a).titleFormatted; },
  'SDK-F05': (a) => { delete act(a).args[1].title; },
  'SDK-F06': (a) => { act(a).args[1].type = 'slider3d'; },
  'SDK-F07': (a) => { a.compatibility = '>=12.2.0'; act(a).args[1].type = 'multiselect'; },
  'SDK-F08': (a) => { delete a.flow.triggers[0].tokens[0].type; },
  'SDK-F09': (a) => { act(a).platforms = ['cloud']; },
  'SDK-F10': (a) => { delete act(a).title; },
  'SDK-P01': (a, f) => { f['.homeychangelog.json'] = JSON.stringify({ changelog: [{ version: '1.0.0', en: 'x' }], '1.2.3': { en: 'ok' } }); },
  'SDK-P02': (a, f) => { f['.homeychangelog.json'] = JSON.stringify({ '1.0.0': { en: 'old' } }); },
  'SDK-P03': null, // build-mode filesystem rule: covered by a dedicated test
  'SDK-P04': null, // size rule: covered by a dedicated test
  'SDK-P05': (a, f) => { f['.homeyignore'] = 'tmp\n!tmp/keep.json\n'; },
  'SDK-P06': (a, f) => { f['README.txt'] = 'See https://example.invalid for more.'; },
};

module.exports = { goodApp, BAD };
