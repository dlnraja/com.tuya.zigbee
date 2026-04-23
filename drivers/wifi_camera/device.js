'use strict';
const { safeDivide } = require('../../lib/utils/tuyaUtils.js');
// v5.12.8: WiFi Camera Device - Tuya IPC with local control + RTSP/snapshot streaming
// Stream methods: Cloud RTSP (Tuya IoT API), Direct LAN RTSP, Snapshot-only
// Homey Pro v12.12.0+ auto-converts RTSP to WebRTC via built-in proxy
// Security: credentials in settings (encrypted by Homey), RTSP URLs never logged in full
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

// Fallback DP mappings (some cameras use different DPs)
const DP_ALT = {
  PRIVACY_MODE: '109',
  MOTION_SWITCH: '104',
  MOTION_ALARM: '185',
  NIGHT_VISION: '104',
};

const RTSP_REFRESH_INTERVAL = 270000; // 4.5 min (cloud RTSP URLs expire ~5 min)
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

    // Ensure capabilities
    if (!this.hasCapability('alarm_motion')) {
      await this.addCapability('alarm_motion').catch(() => {});
    }
    if (!this.hasCapability('onoff')) {
      await this.addCapability('onoff').catch(() => {});
    }

    // Privacy mode = onoff (inverted: on=camera active, off=privacy/covered)
    this.registerCapabilityListener('onoff', async (value) => {
      // value=true means camera ON (privacy OFF), value=false means camera OFF (privacy ON)
      await this._setDP(DP.PRIVACY_MODE, !value);
      });

    // Initialize cloud client for RTSP
    await this._initCloudClient();

    // Initialize local TCP connection for DP control
    await this._initLocalConnection();

    // Setup video stream
    await this._setupVideoStream();

    // Setup snapshot image
    await this._setupSnapshotImage();

    // Flow cards
    this._registerFlowCards();

    this.log('[WIFI-CAM] Ready:', this.getName());
  }

  //  Cloud Client (for RTSP URL allocation) 
  async _initCloudClient() {
    const s = this.getSettings();
    if (s.stream_method === 'lan_rtsp' || s.stream_method === 'snapshot_only') return;
    if (!s.tuya_access_id || !s.tuya_access_key) {
      this.log('[WIFI-CAM] No Tuya Cloud credentials, cloud RTSP unavailable');
      return;
    }
    try {
      this._cloudClient = new TuyaCameraClient({
        accessId: s.tuya_access_id,
        accessKey: s.tuya_access_key,
        region: s.tuya_region || 'eu',
        log: this,
      });
      // Login to get token
      // Note: TuyaCameraClient extends TuyaCloudAPI which uses IoT platform auth
      // The token is obtained via the first API call with client_credentials
      this.log('[WIFI-CAM] Cloud client initialized, region:', s.tuya_region || 'eu');
    } catch (err) {
      this.error('[WIFI-CAM] Cloud client init failed:', err.message);
    }
  }

  //  Local TCP Connection (for DP control) 
  async _initLocalConnection() {
    const s = this.getSettings();
    if (!s.device_id || !s.local_key) {
      this.log('[WIFI-CAM] No local credentials, DP control unavailable');
      return;
    }
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
      this._tuyaDevice.on('error', (err) => {
        this.error('[WIFI-CAM] TCP error:', err.message);
      });
      this._tuyaDevice.on('data', (data) => this._onDPData(data));
      this._tuyaDevice.on('dp-refresh', (data) => this._onDPData(data));
      // Connect
      try {
        if (s.ip) {
          await this._tuyaDevice.connect();
        } else {
          await this._tuyaDevice.find({ timeout: 10000 });
          await this._tuyaDevice.connect();
        }
      } catch (err) {
        this.log('[WIFI-CAM] Initial connect failed:', err.message);
        this._scheduleReconnect();
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

  //  DP Data Handler 
  _onDPData(data) {
    if (!data || !data.dps) return;
    const dps = data.dps;
    this.log('[WIFI-CAM] DPs:', JSON.stringify(dps));

    // Motion alarm
    if (dps[DP.MOTION_ALARM] !== undefined || dps[DP_ALT.MOTION_ALARM] !== undefined) {
      const motion = !!(dps[DP.MOTION_ALARM] || dps[DP_ALT.MOTION_ALARM]);
      const now = Date.now();
      if (motion && now - this._lastMotionTime > 5000) {
        this._lastMotionTime = now;
        this.setCapabilityValue('alarm_motion', true).catch(() => {});
        // Auto-clear after 30s
        setTimeout(() => {
          this.setCapabilityValue('alarm_motion', false).catch(() => {});
        }, 30000);
      }
    }

    // Privacy mode (inverted)
    if (dps[DP.PRIVACY_MODE] !== undefined) {
      if (result.success && result.result && result.result.url) {
        const rtspUrl = result.result.url;
        this.log('[WIFI-CAM] Cloud RTSP allocated (URL redacted for security)');
        if (this._video) {
          // Update existing video
          this._video.setUrl(rtspUrl);
        } else {
          this._video = await this.homey.videos.createVideoRTSP(rtspUrl);
          await this.setCameraVideo('main', 'Camera', this._video);
        }
      } else {
        this.log('[WIFI-CAM] Cloud RTSP allocation failed:', result.msg || 'unknown');
        // Fallback to HLS
        const hlsResult = await this._cloudClient.allocateHLS(s.device_id);
        if (hlsResult.success && hlsResult.result && hlsResult.result.url) {
          this.log('[WIFI-CAM] Fallback to HLS stream');
          this._video = await this.homey.videos.createVideoHLS(hlsResult.result.url);
          await this.setCameraVideo('main', 'Camera', this._video);
        }
      }
    } catch (err) {
      this.error('[WIFI-CAM] RTSP allocation error:', err.message);
    }
  }

  _startRTSPRefresh() {
    if (this._rtspRefreshTimer) clearInterval(this._rtspRefreshTimer);
    this._rtspRefreshTimer = setInterval(() => {
      this._allocateCloudRTSP().catch(e => this.error('[WIFI-CAM] RTSP refresh error:', e.message));
    }, RTSP_REFRESH_INTERVAL);
  }

  //  Snapshot Image 
  async _setupSnapshotImage() {
    try {
      this._image = await this.homey.images.createImage();
      this._image.setStream(async (stream) => {
        await this._captureSnapshot(stream);
      });
      await this.setCameraImage('snapshot', 'Snapshot', this._image);
      this.log('[WIFI-CAM] Snapshot image registered');
    } catch (err) {
      this.error('[WIFI-CAM] Snapshot setup failed:', err.message);
    }
  }

  async _captureSnapshot(stream) {
    const s = this.getSettings();
    // Try cloud snapshot first
    if (this._cloudClient && s.device_id) {
      try {
        const result = await this._cloudClient.getSnapshot(s.device_id);
        if (result.success && result.result) {
          const url = result.result.url || result.result.pic;
          if (url && /^https?:\/\//i.test(url)) {
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
        }
      } catch (err) {
        this.error('[WIFI-CAM] Cloud snapshot failed:', err.message);
      }
    }
    // Fallback: if LAN RTSP, could extract frame (would need ffmpeg, skip for now)
    stream.end();
  }

  //  DP Commands 
  async _setDP(dp, value) {
    if (!this._tuyaDevice || !this._connected) {
      this.log('[WIFI-CAM] Cannot set DP - not connected');
      // Try cloud command as fallback
      if (this._cloudClient) {
        const s = this.getSettings();
        try {
          const dpCode = this._dpToCode(dp);
          if (dpCode) {
            await this._cloudClient.sendCameraCommand(s.device_id, dpCode, value);
            return;
          }
        } catch (e) { this.error('[WIFI-CAM] Cloud command failed:', e.message); }
      }
      throw new Error('Camera not connected');
    }
    await this._tuyaDevice.set({ dps: parseInt(dp , 10), set: value });
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

  //  Settings Handler 
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    // Stream config changed
    if (changedKeys.some(k => ['stream_method', 'rtsp_url', 'tuya_access_id', 'tuya_access_key', 'tuya_region'].includes(k))) {
      this._stopTimers();
      await this._initCloudClient();
      await this._setupVideoStream();
    }
    // Night vision
    if (changedKeys.includes('night_vision')) {
      await this._setDP(DP.NIGHT_VISION, parseInt(newSettings.night_vision , 10)).catch(e => this.error(e));
    }
    // Motion sensitivity
    if (changedKeys.includes('motion_sensitivity')) {
      await this._setDP(DP.MOTION_SENSITIVITY, parseInt(newSettings.motion_sensitivity , 10)).catch(e => this.error(e));
    }
    // Motion detection on/off
    if (changedKeys.includes('motion_detection')) {
      await this._setDP(DP.MOTION_SWITCH, newSettings.motion_detection).catch(e => this.error(e));
    }
    // Local connection changed
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
      } catch (e) { /* ignore */ }
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
      const privacyCard = this.homey.flow.getActionCard('wifi_camera_set_privacy')
      privacyCard.registerRunListener(async (args ) => {
        await this._setDP(DP.PRIVACY_MODE, args.mode === 'on');
      });
      const nvCard = this.homey.flow.getActionCard('wifi_camera_set_night_vision')
      nvCard.registerRunListener(async (args ) => {
        await this._setDP(DP.NIGHT_VISION, parseInt(args.mode , 10));
      });
      const ptzCard = this.homey.flow.getActionCard('wifi_camera_ptz_move')
      ptzCard.registerRunListener(async (args) => {
        await this._setDP(DP.PTZ_CONTROL, args.direction );setTimeout(() => this._setDP(DP.PTZ_STOP, true).catch(() => {}), 1000);
      });
    } catch (e) { this.error('[WIFI-CAM] Flow card registration:', e.message); }
  }
}

module.exports = WiFiCameraDevice;

