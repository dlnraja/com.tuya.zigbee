'use strict';

const assert = require('assert');
const DaylightAtmosphere = require('../../lib/features/DaylightAtmosphere');

// Night elevation → warm + dim
const night = DaylightAtmosphere.compute({ elevation: -20 });
assert.ok(night.kelvin <= 2700, `night kelvin ${night.kelvin}`);
assert.ok(night.bright <= 0.35, `night bright ${night.bright}`);
assert.ok(night.temperature >= 0.7, `night temp ${night.temperature}`);

// High sun → cool + bright
const day = DaylightAtmosphere.compute({ elevation: 55 });
assert.ok(day.kelvin >= 5000, `day kelvin ${day.kelvin}`);
assert.ok(day.bright >= 0.85, `day bright ${day.bright}`);
assert.ok(day.temperature <= 0.4, `day temp ${day.temperature}`);

// Room Balance: bright lux cools slightly
const balanced = DaylightAtmosphere.compute({ elevation: 30, lux: 1200 });
const plain = DaylightAtmosphere.compute({ elevation: 30 });
assert.ok(balanced.kelvin >= plain.kelvin, 'lux bias should cool or equal');

// Clock fallback
const clock = DaylightAtmosphere.compute({});
assert.ok(clock.kelvin >= 2000 && clock.kelvin <= 6500);
assert.strictEqual(clock.source === 'clock' || clock.source === 'solar', true);

console.log('l99-daylight-atmosphere: OK');
