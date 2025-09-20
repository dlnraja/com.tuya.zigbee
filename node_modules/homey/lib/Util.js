'use strict';

const crypto = require('crypto');

const fse = require('fs-extra');

module.exports = class Util {

  static md5(input) {
    return crypto
      .createHash('md5')
      .update(input)
      .digest('hex');
  }

  static ellipsis(str) {
    if (str.length > 10) {
      return `${str.substr(0, 5)}...${str.substr(str.length - 5, str.length)}`;
    }
    return str;
  }

  static async getFileHash(filepath, algorithm = 'md5') {
    const buf = await fse.readFile(filepath);

    if (algorithm === 'md5') {
      const md5 = this.md5(buf);
      return md5;
    }

    throw new Error(`Unknown Algorithm: ${algorithm}`);
  }

  static parseMacToDecArray(macAddress) {
    const mac = [];
    macAddress
      .slice(0, 8)
      .split(':') // TODO - is also a valid MAC address seperator
      .forEach(macByte => mac.push(parseInt(macByte, 16)));

    return mac;
  }

};
