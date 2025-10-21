'use strict';
const converter = require('../../lib/tuya-engine/converters/onoff');

describe('OnOff', () => {
  test('converts true', () => {
    expect(converter.fromDP(true)).toBe(true);
  });
});
