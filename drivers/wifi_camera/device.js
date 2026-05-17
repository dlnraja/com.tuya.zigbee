'use strict';
const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
// v5.12.8: WiFi Camera Device - Tuya IPC with local control + RTSP/snapshot streaming
const Homey = require('homey');
const TuyaCameraClient = require('../../lib/tuya-camera/TuyaCameraClient');

// Tuya IPC DataPoints
const DP = {
  PRIVACY_MODE: '105',     // bool - basic_private (lens cover)
  MOTION_SWITCH: '134',    // bool - motion detection on/off
  MOTION_ALARM: '115',     // raw/bool - motion detected event
  NIGHT_VISION: '108',     // enum 0=auto,1=off,2=on
  MOTION_SENSITIVITY: '106', // enum 0=low,1=medium,2=high
  BASIC_FLIP: '103',       // bool - image flip
  INDICATOR_LED: '101',    // bool - status LED
  SD_RECORD: '150',        // bool - SD card recording
  PTZ_CONTROL: '119',      // string - "0"=up,"1"=right upper,"2"=right,"3"=right lower,"4"=down,"5"=left lower,"6"=left,"7"=left upper
  PTZ_STOP: '116',         // bool - stop PTZ
};

const DP_ALT = {
  PRIVACY_MODE: '109',
  MOTION_SWITCH: '104',
  MOTION_ALARM: '185',
  NIGHT_VISION: '104',
};

const RTSP_REFRESH_INTERVAL = 270000;
const SNAPSHOT_INTERVAL = 30000;

class WiFiCameraDevice extends Homey.Device {

  async onInit() {
    this.log('[WIFI-CAM] Initializing:', this.getName());
    this._cloudClient = null;
    this._video = null;
    this._image = null;
    this._rtspRefreshTimer = null;
    this._snapshotTimer = null;
    this._tuyaDevice = null;
    this._connected = false;
    this._reconnectTimer = null;
    this._lastMotionTime = 0;

    if (!this.hasCapability('alarm_motion')) {
      await this.addCapability('alarm_motion').catch(() => {});
    }
    if (!this.hasCapability('onoff')) {
      await this.addCapability('onoff').catch(() => {});
    }

    this.registerCapabilityListener('onoff', async (value) => {
      await this._setDP(DP.PRIVACY_MODE, !value);
    });

    await this._initCloudClient();
    await this._initLocalConnection();
    await this._setupVideoStream();
    await this._setupSnapshotImage();
    this._registerFlowCards();

    this.log('[WIFI-CAM] Ready:', this.getName());
  }

  async _initCloudClient() {
    const s = this.getSettings();
    if (s.stream_method === 'lan_rtsp' || s.stream_method === 'snapshot_only') return;
    if (!s.tuya_access_id || !s.tuya_access_key) return;
    try {
      this._cloudClient = new TuyaCameraClient({
        accessId: s.tuya_access_id,
        accessKey: s.tuya_access_key,
        region: s.tuya_region || 'eu',
        log: this,
      });
    } catch (err) {
      this.error('[WIFI-CAM] Cloud client init failed:', err.message);
    }
  }

  async _initLocalConnection() {
    const s = this.getSettings();
    if (!s.device_id || !s.local_key) return;
    try {
      const TuyAPI = require('tuyapi');
      this._tuyaDevice = new TuyAPI({
        id: s.device_id,
        key: s.local_key,
        ip: s.ip || undefined,
        version: s.protocol_version || '3.4',
        issueRefreshOnConnect: true,
      });
      this._tuyaDevice.on('connected', () => {
        this.log('[WIFI-CAM] TCP connected');
        this._connected = true;
        this.setAvailable().catch(() => {});
      });
      this._tuyaDevice.on('disconnected', () => {
        this.log('[WIFI-CAM] TCP disconnected');
        this._connected = false;
        this._scheduleReconnect();
      });
      this._tuyaDevice.on('error', (err) => this.error('[WIFI-CAM] TCP error:', err.message));
      this._tuyaDevice.on('data', (data) => this._onDPData(data));
      this._tuyaDevice.on('dp-refresh', (data) => this._onDPData(data));
      
      if (s.ip) {
        await this._tuyaDevice.connect().catch(() => this._scheduleReconnect());
      } else {
        await this._tuyaDevice.find({ timeout: 10000 }).catch(() => {});
        await this._tuyaDevice.connect().catch(() => this._scheduleReconnect());
      }
    } catch (err) {
      this.error('[WIFI-CAM] TuyAPI init failed:', err.message);
    }
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    this._reconnectTimer = setTimeout(async () => {
      if (this._tuyaDevice && !this._tuyaDevice.isConnected()) {
        try {
          await this._tuyaDevice.find({ timeout: 10000 });
          await this._tuyaDevice.connect();
        } catch (e) {
          this._scheduleReconnect();
        }
      }
    }, 15000);
  }

  _onDPData(data) {
    if (!data || !data.dps) return;
    const dps = data.dps;
    
    if (dps[DP.MOTION_ALARM] !== undefined || dps[DP_ALT.MOTION_ALARM] !== undefined) {
      const motion = !!(dps[DP.MOTION_ALARM] || dps[DP_ALT.MOTION_ALARM]);
      const now = Date.now();
      if (motion && now - this._lastMotionTime > 5000) {
        this._lastMotionTime = now;
        this.setCapabilityValue('alarm_motion', true).catch(() => {});
        setTimeout(() => this.setCapabilityValue('alarm_motion', false).catch(() => {}), 30000);
      }
    }

    if (dps[DP.PRIVACY_MODE] !== undefined) {
      this.setCapabilityValue('onoff', !dps[DP.PRIVACY_MODE]).catch(() => {});
    }
  }

  async _setupVideoStream() {
    const s = this.getSettings();
    if (s.stream_method === 'lan_rtsp') {
       if (s.rtsp_url) {
         this._video = await this.homey.videos.createVideoRTSP(s.rtsp_url);
         await this.setCameraVideo('main', 'Camera', this._video);
       }
    } else if (s.stream_method === 'cloud_rtsp') {
       await this._allocateCloudRTSP();
       this._startRTSPRefresh();
    }
  }

  async _allocateCloudRTSP() {
    const s = this.getSettings();
    if (!this._cloudClient || !s.device_id) return;
    try {
      const result = await this._cloudClient.allocateRTSP(s.device_id);
      if (result.success && result.result?.url) {
        if (this._video) this._video.setUrl(result.result.url);
        else {
          this._video = await this.homey.videos.createVideoRTSP(result.result.url);
          await this.setCameraVideo('main', 'Camera', this._video);
        }
      } else {
        const hlsResult = await this._cloudClient.allocateHLS(s.device_id);
        if (hlsResult.success && hlsResult.result?.url) {
          if (this._video) this._video.setUrl(hlsResult.result.url);
          else {
            this._video = await this.homey.videos.createVideoHLS(hlsResult.result.url);
            await this.setCameraVideo('main', 'Camera', this._video);
          }
        }
      }
    } catch (err) {
      this.error('[WIFI-CAM] RTSP allocation error:', err.message);
    }
  }

  _startRTSPRefresh() {
    if (this._rtspRefreshTimer) clearInterval(this._rtspRefreshTimer);
    this._rtspRefreshTimer = setInterval(() => {
      this._allocateCloudRTSP().catch(e => this.error(e));
    }, RTSP_REFRESH_INTERVAL);
  }

  async _setupSnapshotImage() {
    try {
      this._image = await this.homey.images.createImage();
      this._image.setStream(async (stream) => {
        await this._captureSnapshot(stream);
      });
      await this.setCameraImage('snapshot', 'Snapshot', this._image);
    } catch (err) {
      this.error('[WIFI-CAM] Snapshot setup failed:', err.message);
    }
  }

  async _captureSnapshot(stream) {
    const s = this.getSettings();
    if (this._cloudClient && s.device_id) {
      try {
        const result = await this._cloudClient.getSnapshot(s.device_id);
        if (result.success && (result.result?.url || result.result?.pic)) {
          const url = result.result.url || result.result.pic;
          const https = require('https');
          const http = require('http');
          const client = url.startsWith('https') ? https : http;
          return new Promise((resolve, reject) => {
            client.get(url, { timeout: 10000 }, (res) => {
              res.pipe(stream);
              res.on('end', resolve);
              res.on('error', reject);
            }).on('error', reject);
          });
        }
      } catch (err) {
        this.error('[WIFI-CAM] Cloud snapshot failed:', err.message);
      }
    }
    stream.end();
  }

  async _setDP(dp, value) {
    if (!this._tuyaDevice || !this._connected) {
      if (this._cloudClient) {
        const s = this.getSettings();
        const code = this._dpToCode(dp);
        if (code) return this._cloudClient.sendCameraCommand(s.device_id, code, value);
      }
      throw new Error('Camera not connected');
    }
    await this._tuyaDevice.set({ dps: parseInt(dp, 10), set: value });
  }

  _dpToCode(dp) {
    const map = {
      [DP.PRIVACY_MODE]: 'basic_private',
      [DP.MOTION_SWITCH]: 'motion_switch',
      [DP.NIGHT_VISION]: 'basic_nightvision',
      [DP.MOTION_SENSITIVITY]: 'motion_sensitivity',
      [DP.BASIC_FLIP]: 'basic_flip',
      [DP.INDICATOR_LED]: 'basic_indicator',
      [DP.SD_RECORD]: 'record_switch',
    };
    return map[dp] || null;
  }

  async onSettings({ oldSettings, newSettings, changedKeys }) {
    if (changedKeys.some(k => ['stream_method', 'rtsp_url', 'tuya_access_id', 'tuya_access_key', 'tuya_region'].includes(k))) {
      this._stopTimers();
      await this._initCloudClient();
      await this._setupVideoStream();
    }
    if (changedKeys.includes('night_vision')) {
      await this._setDP(DP.NIGHT_VISION, parseInt(newSettings.night_vision, 10)).catch(e => this.error(e));
    }
    if (changedKeys.includes('motion_sensitivity')) {
      await this._setDP(DP.MOTION_SENSITIVITY, parseInt(newSettings.motion_sensitivity, 10)).catch(e => this.error(e));
    }
    if (changedKeys.includes('motion_detection')) {
      await this._setDP(DP.MOTION_SWITCH, newSettings.motion_detection).catch(e => this.error(e));
    }
    if (changedKeys.some(k => ['device_id', 'local_key', 'ip', 'protocol_version'].includes(k))) {
      this._destroyLocalConnection();
      await this._initLocalConnection();
    }
  }

  _stopTimers() {
    if (this._rtspRefreshTimer) { clearInterval(this._rtspRefreshTimer); this._rtspRefreshTimer = null; }
    if (this._snapshotTimer) { clearInterval(this._snapshotTimer); this._snapshotTimer = null; }
  }

  _destroyLocalConnection() {
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    if (this._tuyaDevice) {
      try {
        this._tuyaDevice.removeAllListeners();
        if (this._tuyaDevice.isConnected()) this._tuyaDevice.disconnect();
      } catch (e) {}
      this._tuyaDevice = null;
    }
    this._connected = false;
  }

  async onDeleted() {
    this._stopTimers();
    this._destroyLocalConnection();
  }

  _registerFlowCards() {
    try {
      const privacyCard = (() => { try { return this.homey.flow.getActionCard('wifi_camera_set_privacy'); } catch (e) { return null; } })();
      if (privacyCard) privacyCard.registerRunListener(async (args) => this._setDP(DP.PRIVACY_MODE, args.mode === 'on'));
      
      const nvCard = (() => { try { return this.homey.flow.getActionCard('wifi_camera_set_night_vision'); } catch (e) { return null; } })();
      if (nvCard) nvCard.registerRunListener(async (args) => this._setDP(DP.NIGHT_VISION, parseInt(args.mode, 10)));
      
      const ptzCard = (() => { try { return this.homey.flow.getActionCard('wifi_camera_ptz_move'); } catch (e) { return null; } })();
      if (ptzCard) ptzCard.registerRunListener(async (args) => {
        await this._setDP(DP.PTZ_CONTROL, args.direction);
        setTimeout(() => this._setDP(DP.PTZ_STOP, true).catch(() => {}), 1000);
      });
    } catch (e) { this.error('[WIFI-CAM] Flow card registration:', e.message); }
  }
}

module.exports = WiFiCameraDevice;
