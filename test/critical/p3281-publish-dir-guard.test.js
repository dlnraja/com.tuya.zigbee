'use strict';
// A publish directory that still has .homeycompose, or whose driver folders do not
// match app.json, must not be uploaded. That is how a 476-driver compose rebuild
// would replace the filtered payload.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { problems } = require('../../scripts/ci/publish-dir-guard.cjs');

function tempApp(setup) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-dir-'));
  setup(dir);
  return dir;
}

test('a directory with .homeycompose is refused even when app.json looks filtered', () => {
  const dir = tempApp((root) => {
    fs.mkdirSync(path.join(root, '.homeycompose'));
    fs.writeFileSync(path.join(root, '.homeycompose', 'app.json'), '{"id":"com.example.app"}\n');
    fs.mkdirSync(path.join(root, 'drivers', 'switch_1gang'), { recursive: true });
    fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify({
      id: 'com.dlnraja.tuya.zigbee', version: '9.0.1618', drivers: [{ id: 'switch_1gang' }],
    }));
  });
  const found = problems(dir, { appId: 'com.dlnraja.tuya.zigbee' });
  assert.ok(found.some((line) => line.includes('.homeycompose')), found.join('\n'));
});

test('driver folders that disagree with app.json are refused', () => {
  const dir = tempApp((root) => {
    fs.mkdirSync(path.join(root, 'drivers', 'switch_1gang'), { recursive: true });
    fs.mkdirSync(path.join(root, 'drivers', 'heiman_keyfob'), { recursive: true });
    fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify({
      id: 'com.dlnraja.tuya.zigbee', drivers: [{ id: 'switch_1gang' }],
    }));
  });
  const found = problems(dir, { appId: 'com.dlnraja.tuya.zigbee' });
  assert.ok(found.some((line) => line.includes('heiman_keyfob')), found.join('\n'));
});

test('a filtered directory with matching folders and no compose is accepted', () => {
  const dir = tempApp((root) => {
    fs.mkdirSync(path.join(root, 'drivers', 'switch_1gang'), { recursive: true });
    fs.mkdirSync(path.join(root, '.homeybuild'), { recursive: true });
    const app = { id: 'com.dlnraja.tuya.zigbee', version: '9.0.1618', drivers: [{ id: 'switch_1gang' }] };
    fs.writeFileSync(path.join(root, 'app.json'), JSON.stringify(app));
    fs.writeFileSync(path.join(root, '.homeybuild', 'app.json'), JSON.stringify(app));
  });
  assert.deepStrictEqual(problems(dir, { appId: 'com.dlnraja.tuya.zigbee' }), []);
});

test('the real publish temp from this workspace, when present, is not the compose root', () => {
  const dir = path.join(os.tmpdir(), 'homey-publish-temp');
  if (!fs.existsSync(path.join(dir, 'app.json'))) return;
  const found = problems(dir, { appId: 'com.dlnraja.tuya.zigbee' });
  assert.deepStrictEqual(found, [], found.join('\n'));
  const app = JSON.parse(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'));
  assert.ok(app.drivers.length < 476, `filtered payload still has ${app.drivers.length} drivers`);
  assert.ok(!fs.existsSync(path.join(dir, '.homeycompose')));
});
