'use strict';

const TUYA_DATA_TYPES = {
  raw: 0,
  bool: 1,
  value: 2,
  string: 3,
  enum: 4,
  bitmap: 5,
};

/**
 * Parse Tuya datapoint payload from cluster reporting/response.
 * WHY(P2300): Homey may deliver data as Buffer, number[], or already-decoded.
 */
const getDataValue = (dpValue) => {
  if (dpValue == null) return undefined;
  if (dpValue.value !== undefined && dpValue.data === undefined) {
    return dpValue.value;
  }

  let chunks = dpValue.data;
  if (Buffer.isBuffer(chunks)) {
    chunks = Array.from(chunks);
  } else if (chunks && typeof chunks === 'object' && chunks.type === 'Buffer' && Array.isArray(chunks.data)) {
    chunks = chunks.data;
  }

  const convertMultiByteNumberPayloadToSingleDecimalNumber = (parts) => {
    let value = 0;
    for (let i = 0; i < parts.length; i++) {
      value = (value << 8) + parts[i];
    }
    return value;
  };

  const datatype = dpValue.datatype;
  switch (datatype) {
    case TUYA_DATA_TYPES.raw:
      return chunks;
    case TUYA_DATA_TYPES.bool:
      return Array.isArray(chunks) ? chunks[0] === 1 : !!chunks;
    case TUYA_DATA_TYPES.value:
      if (typeof chunks === 'number') return chunks;
      return convertMultiByteNumberPayloadToSingleDecimalNumber(chunks || []);
    case TUYA_DATA_TYPES.string: {
      if (typeof chunks === 'string') return chunks;
      let dataString = '';
      for (let i = 0; i < (chunks || []).length; ++i) {
        dataString += String.fromCharCode(chunks[i]);
      }
      return dataString;
    }
    case TUYA_DATA_TYPES.enum:
      return Array.isArray(chunks) ? chunks[0] : Number(chunks);
    case TUYA_DATA_TYPES.bitmap:
      if (typeof chunks === 'number') return chunks;
      return convertMultiByteNumberPayloadToSingleDecimalNumber(chunks || []);
    default:
      if (typeof chunks === 'number' || typeof chunks === 'boolean') return chunks;
      if (Array.isArray(chunks) && chunks.length === 1) return chunks[0];
      return chunks;
  }
};

module.exports = { getDataValue, TUYA_DATA_TYPES };
