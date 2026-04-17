'use strict';
const { safeMultiply } = require('../../utils/tuyaUtils.js');
module.exports = {
  scale(v, f) {return safeMultiply(v, f); }
};
