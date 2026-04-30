'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaCloudAPI = require('../tuya-local/TuyaCloudAPI');
class TuyaCameraClient extends TuyaCloudAPI {
  _sanitizeId(id) { return String(id).replace(/[^a-zA-Z0-9_-]/g, ''); }
  async allocateRTSP(deviceId) {
    deviceId = this._sanitizeId(deviceId);
    await this._refreshTokenIfNeeded();
    const uid = this.tokenInfo.uid;
    return this._post('/v1.0/users/' + uid + '/devices/' + deviceId + '/stream/actions/allocate', { type: 'rtsp' });
  }
  async allocateHLS(deviceId) {
    deviceId = this._sanitizeId(deviceId);
    await this._refreshTokenIfNeeded();
    const uid = this.tokenInfo.uid;
    return this._post('/v1.0/users/' + uid + '/devices/' + deviceId + '/stream/actions/allocate', { type: 'hls' });
  }
  async getSnapshot(deviceId) {
    deviceId = this._sanitizeId(deviceId);
    await this._refreshTokenIfNeeded();
    return this._get('/v1.0/devices/' + deviceId + '/camera-config', { type: 'pic' });
  }
  async getCameraStatus(deviceId) {
    deviceId = this._sanitizeId(deviceId);
    await this._refreshTokenIfNeeded();
    return this._get('/v1.0/iot-03/devices/' + deviceId + '/status');
  }
  async sendCameraCommand(deviceId, code, value) {
    deviceId = this._sanitizeId(deviceId);
    await this._refreshTokenIfNeeded();
    return this._post('/v1.0/iot-03/devices/' + deviceId + '/commands', { commands: [{ code, value }] });
  }
}
module.exports = TuyaCameraClient;
