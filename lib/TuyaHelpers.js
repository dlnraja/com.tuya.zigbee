'use strict';

// Utilitaires pour traiter les données Tuya Zigbee
class TuyaHelpers {
  // Décodage des données Tuya
  static processTuyaData(dpValue, dpType) {
    switch (dpType) {
      case 'raw':
        return dpValue;
      case 'bool':
        return dpValue[0] === 1;
      case 'value':
        return dpValue.readUInt32BE(0);
      case 'string':
        let str = '';
        for (let i = 0; i < dpValue.length; i++) {
          str += String.fromCharCode(dpValue[i]);
        }
        return str;
      case 'enum':
        return dpValue[0];
      default:
        return null;
    }
  }
  
  // Encodage des données pour Tuya
  static prepareTuyaData(dpValue, dpType) {
    let data;
    
    switch (dpType) {
      case 'raw':
        data = Buffer.from(dpValue);
        break;
      
      case 'bool':
        data = Buffer.alloc(1);
        data.writeUInt8(dpValue ? 1 : 0, 0);
        break;
      
      case 'value':
        data = Buffer.alloc(4);
        data.writeUInt32BE(dpValue, 0);
        break;
      
      case 'string':
        data = Buffer.from(dpValue, 'ascii');
        break;
      
      case 'enum':
        data = Buffer.alloc(1);
        data.writeUInt8(dpValue, 0);
        break;
      
      default:
        return null;
    }
    
    return data;
  }
}

module.exports = TuyaHelpers;
