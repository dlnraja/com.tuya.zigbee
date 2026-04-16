'use strict';

module.exports = {
  start() {
    return this.getDriver().getAvailableDevices();
  }
};