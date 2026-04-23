'use strict';

const crypto = require('crypto');

class EweLinkCrypto {
  static deriveKey(apiKey) {
    return crypto.createHash('md5').update(apiKey, 'utf8').digest();
  }

  static encrypt(data, apiKey, iv) {
    const key = this.deriveKey(apiKey);
    if (!iv) iv = crypto.randomBytes(16);
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const cipher = crypto.createCipheriv('aes-128-cbc', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return { data: encrypted.toString('base64'), iv: iv.toString('base64') };
  }

  static decrypt(encryptedBase64, apiKey, ivBase64) {
    const key = this.deriveKey(apiKey);
    const iv = Buffer.from(ivBase64, 'base64');
    const encrypted = Buffer.from(encryptedBase64, 'base64');
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    const text = decrypted.toString('utf8');
    try { return JSON.parse(text); } catch (e) { return text; }
  }
}

module.exports = EweLinkCrypto;
