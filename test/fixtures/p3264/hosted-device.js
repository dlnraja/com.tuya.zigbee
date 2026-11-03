'use strict';
// P3264 test fixture: stand-in for a hosted profile device class.
class FakeHostedDevice { async onInit() { this.inited = true; } }
module.exports = FakeHostedDevice;
