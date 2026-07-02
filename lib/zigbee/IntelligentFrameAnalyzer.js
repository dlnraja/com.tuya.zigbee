'use strict';

const IntelligentDPAutoDiscovery = require('../sensors/IntelligentDPAutoDiscovery');

const CLUSTER_NAMES = {
  0x0001: 'genPowerCfg',
  0x0006: 'genOnOff',
  0x0008: 'genLevelCtrl',
  0x000A: 'genTime',
  0x0400: 'msIlluminanceMeasurement',
  0x0402: 'msTemperatureMeasurement',
  0x0405: 'msRelativeHumidity',
  0x0406: 'msOccupancySensing',
  0x0500: 'ssIasZone',
  0xEF00: 'tuya'
};

const ONOFF_COMMANDS = {
  0x00: 'off',
  0x01: 'on',
  0x02: 'toggle',
  0x40: 'offWithEffect',
  0x41: 'onWithRecallGlobalScene',
  0x42: 'onWithTimedOff'
};

class IntelligentFrameAnalyzer {
  constructor(device) {
    this.device = device;
    this.frameCount = 0;
  }

  analyze(frame, meta = {}) {
    if (arguments.length >= 4) {
      return this.parse(arguments[0], arguments[1], arguments[2], arguments[3]);
    }
    return this.parse(meta.endpointId, meta.clusterId, frame, meta);
  }

  parse(endpointId, clusterId, frame, meta = {}) {
    const decoded = this._decode(endpointId, clusterId, frame, meta, 'rx');
    this._feedDiscovery(decoded);
    return decoded;
  }

  recordTx(endpointId, clusterId, frame, meta = {}) {
    const decoded = this._decode(endpointId, clusterId, frame, meta, 'tx');
    this._feedDiscovery(decoded);
    return decoded;
  }

  recordFrame(frame, direction = 'rx', meta = {}) {
    const decoded = this._decode(
      frame?.endpointId ?? frame?.endpoint ?? meta.endpointId,
      frame?.clusterId ?? frame?.cluster ?? meta.clusterId,
      frame,
      meta,
      direction
    );
    this._feedDiscovery(decoded);
    return decoded;
  }

  _decode(endpointId, clusterId, frame, meta, direction) {
    this.frameCount += 1;
    const numericClusterId = this._numberFromAny(clusterId ?? frame?.clusterId ?? frame?.cluster);
    const numericEndpoint = this._numberFromAny(endpointId ?? frame?.endpointId ?? frame?.endpoint);
    const commandId = this._numberFromAny(frame?.CommandID ?? frame?.commandId ?? frame?.cmd ?? meta?.commandId);
    const payload = frame?.Payload ?? frame?.payload ?? frame?.data ?? frame?.Data ?? frame?.raw ?? meta?.payload;
    const rawBuffer = Buffer.isBuffer(payload) ? payload : Buffer.isBuffer(frame) ? frame : null;
    const commandName = this._commandName(numericClusterId, commandId, frame);
    const datapoints = this._extractTuyaDatapoints(frame, payload, numericClusterId);
    const attributes = this._extractAttributes(frame, payload, numericClusterId);

    return {
      type: datapoints.length ? 'tuya_dp' : attributes.length ? 'zcl_attribute' : commandName || 'zigbee_frame',
      direction,
      endpoint: numericEndpoint || 1,
      clusterId: numericClusterId,
      clusterHex: numericClusterId !== null ? `0x${numericClusterId.toString(16)}` : undefined,
      clusterName: CLUSTER_NAMES[numericClusterId] || undefined,
      commandId: commandId === null ? undefined : commandId,
      commandName,
      seqNum: frame?.seqNum ?? frame?.transactionSequenceNumber ?? frame?.sequence ?? meta?.sequence,
      attributes,
      datapoints,
      dpId: datapoints[0]?.dpId,
      dpType: datapoints[0]?.dpType,
      value: datapoints[0]?.value,
      rawLength: rawBuffer ? rawBuffer.length : undefined,
      rawPrefix: rawBuffer ? rawBuffer.toString('hex', 0, Math.min(rawBuffer.length, 12)) : undefined,
      lqi: meta?.lqi,
      timestamp: Date.now()
    };
  }

  _feedDiscovery(decoded) {
    if (!decoded) {return;}
    const discovery = this._getDiscovery();
    if (!discovery || typeof discovery.recordFrame !== 'function') {return;}

    try {
      discovery.recordFrame(decoded, decoded.direction || 'rx', {
        source: 'intelligent_frame_analyzer',
        endpoint: decoded.endpoint,
        clusterId: decoded.clusterId,
        commandId: decoded.commandId,
        timestamp: decoded.timestamp
      });
    } catch (err) {
      this.device?.log?.(`[IFA] Discovery feed skipped: ${err.message}`);
    }
  }

  _getDiscovery() {
    if (this.device?._dpAutoDiscovery) {return this.device._dpAutoDiscovery;}
    if (this.device?._discovery) {return this.device._discovery;}
    if (!this.device) {return null;}

    try {
      this.device._dpAutoDiscovery = new IntelligentDPAutoDiscovery(this.device);
      return this.device._dpAutoDiscovery;
    } catch (err) {
      this.device?.log?.(`[IFA] Discovery init skipped: ${err.message}`);
      return null;
    }
  }

  _commandName(clusterId, commandId, frame) {
    if (frame?.commandName) {return frame.commandName;}
    if (clusterId === 0x0006 && commandId !== null && ONOFF_COMMANDS[commandId]) {return ONOFF_COMMANDS[commandId];}
    if (clusterId === 0xEF00) {return 'tuyaData';}
    return undefined;
  }

  _extractAttributes(frame, payload, clusterId) {
    const attributes = [];
    const push = (id, value) => {
      if (id === undefined || id === null) {return;}
      attributes.push({
        id,
        idHex: typeof id === 'number' ? `0x${id.toString(16)}` : String(id),
        value
      });
    };

    const source = frame?.attributes || frame?.Attributes || payload?.attributes || payload?.Attributes;
    if (Array.isArray(source)) {
      for (const attr of source) {push(attr.id ?? attr.attrId ?? attr.attributeId, attr.value ?? attr.attrData);}
    } else if (source && typeof source === 'object') {
      for (const [id, value] of Object.entries(source)) {push(id, value);}
    }

    if (clusterId === 0x0006 && frame?.commandName && !attributes.length) {
      push('command', frame.commandName);
    }

    return attributes;
  }

  _extractTuyaDatapoints(frame, payload, clusterId) {
    const datapoints = [];
    const push = item => {
      if (!item) {return;}
      const dpId = Number(item.dpId ?? item.dp ?? item.id);
      if (!Number.isInteger(dpId) || dpId <= 0 || dpId > 255) {return;}
      datapoints.push({
        dpId,
        dpType: item.dpType ?? item.datatype ?? item.dataType ?? item.type ?? 'unknown',
        value: item.value ?? item.dpValue ?? item.data ?? item.rawValue
      });
    };

    if (Array.isArray(frame?.datapoints)) {frame.datapoints.forEach(push);}
    if (Array.isArray(frame?.dpValues)) {frame.dpValues.forEach(push);}
    if (Array.isArray(frame?.dps)) {frame.dps.forEach(push);}
    if (frame?.dpId !== undefined || frame?.dp !== undefined) {push(frame);}

    if (payload && typeof payload === 'object' && !Buffer.isBuffer(payload)) {
      if (Array.isArray(payload.datapoints)) {payload.datapoints.forEach(push);}
      if (Array.isArray(payload.dpValues)) {payload.dpValues.forEach(push);}
      if (Array.isArray(payload.dps)) {payload.dps.forEach(push);}
      if (payload.dpId !== undefined || payload.dp !== undefined) {push(payload);}
    }

    if (Buffer.isBuffer(payload) && (clusterId === 0xEF00 || datapoints.length === 0)) {
      const parsed = this._parseTuyaPayload(payload);
      parsed.forEach(push);
    }

    const deduped = new Map();
    for (const dp of datapoints) {
      const key = `${dp.dpId}:${dp.dpType}:${this._stableValue(dp.value)}`;
      deduped.set(key, dp);
    }
    return [...deduped.values()].slice(0, 16);
  }

  _parseTuyaPayload(buffer) {
    for (const offset of [0, 1, 2]) {
      const parsed = this._parseTuyaTLV(buffer, offset);
      if (parsed.length) {return parsed;}
    }
    return [];
  }

  _parseTuyaTLV(buffer, startOffset) {
    const datapoints = [];
    let offset = startOffset;

    while (offset + 4 <= buffer.length) {
      const dpId = buffer.readUInt8(offset);
      const dpType = buffer.readUInt8(offset + 1);
      const len = buffer.readUInt16BE(offset + 2);
      if (dpId <= 0 || dpType > 5 || len > 64 || offset + 4 + len > buffer.length) {
        return datapoints;
      }

      const data = buffer.slice(offset + 4, offset + 4 + len);
      datapoints.push({ dpId, dpType, value: this._decodeTuyaValue(dpType, data) });
      offset += 4 + len;
    }

    return datapoints;
  }

  _decodeTuyaValue(dpType, data) {
    if (!Buffer.isBuffer(data)) {return data;}
    if (dpType === 1) {return data[0] === 1;}
    if (dpType === 2 || dpType === 4) {
      if (data.length === 1) {return data.readUInt8(0);}
      if (data.length === 2) {return data.readUInt16BE(0);}
      if (data.length >= 4) {return data.readInt32BE(0);}
    }
    if (dpType === 3) {return data.toString('utf8');}
    if (dpType === 5 && data.length === 1) {return data.readUInt8(0);}
    return { kind: 'buffer', length: data.length, hexPrefix: data.toString('hex', 0, Math.min(data.length, 8)) };
  }

  _numberFromAny(value) {
    if (value === undefined || value === null) {return null;}
    if (typeof value === 'number' && Number.isFinite(value)) {return value;}
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^0x/i.test(trimmed)) {return parseInt(trimmed, 16);}
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? numeric : null;
    }
    return null;
  }

  _stableValue(value) {
    if (Buffer.isBuffer(value)) {return `buffer:${value.length}:${value.toString('hex', 0, Math.min(value.length, 8))}`;}
    if (value && typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (err) {
        return String(value);
      }
    }
    return String(value);
  }
}

module.exports = IntelligentFrameAnalyzer;
