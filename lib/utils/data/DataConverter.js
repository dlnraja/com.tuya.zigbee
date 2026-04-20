'use strict';

/**
 * DataConverter - v5.5.397
 * Universal data format conversion utilities
 * Handles: Buffer, Uint8Array, Array, Hex string, Objects with data property
 */

class DataConverter {
  /**
   * Convert any input to Buffer
   * @param {Buffer|Uint8Array|Array|string|Object} input - Input data
   * @returns {Buffer} - Converted buffer
   */
  static toBuffer(input) {
    if (Buffer.isBuffer(input)) return input;
    if (input instanceof Uint8Array) return Buffer.from(input);
    if (Array.isArray(input)) return Buffer.from(input);
    if (typeof input === 'string') {
      // Handle hex strings with various formats
      const cleaned = input.replace(/[\s0x,\[\]]/gi, '');
      if (/^[0-9A-Fa-f]*$/.test(cleaned) && cleaned.length % 2 === 0) {
        return Buffer.from(cleaned, 'hex');
      }
      return Buffer.from(input, 'utf8');
    }
    if (input?.data) return this.toBuffer(input.data);
    if (input?.buffer) return this.toBuffer(input.buffer);
    if (typeof input === 'number') return Buffer.from([input & 0xFF]);
    return Buffer.alloc(0);
  }

  /**
   * Convert to formatted hex string
   * @param {any} input - Input data
   * @param {string} separator - Separator between bytes (default: ' ')
   * @returns {string} - Hex string like "01 02 AB CD"
   */
  static toHex(input, separator = ' ') {
    const buf = this.toBuffer(input);
    return buf.toString('hex').toUpperCase().match(/.{2}/g)?.join(separator) || '';
  }

  /**
   * Convert to compact hex (no spaces)
   * @param {any} input - Input data
   * @returns {string} - Hex string like "0102ABCD"
   */
  static toHexCompact(input) {
    return this.toBuffer(input).toString('hex').toUpperCase();
  }

  /**
   * Convert to byte array
   * @param {any} input - Input data
   * @returns {number[]} - Array of bytes
   */
  static toArray(input) {
    return [...this.toBuffer(input)];
  }

  /**
   * Convert to binary string representation
   * @param {any} input - Input data
   * @returns {string} - Binary string like "00000001 00000010"
   */
  static toBinary(input) {
    return this.toArray(input).map(b => b.toString(2).padStart(8, '0')).join(' ');
  }

  /**
   * Convert to JSON-safe format
   * @param {any} input - Input data
   * @returns {Object} - { hex, array, length }
   */
  static toJSON(input) {
    const buf = this.toBuffer(input);
    return {
      hex: this.toHex(buf),
      array: this.toArray(buf),
      length: buf.length
    };
  }

  /**
   * Compare two data inputs for equality
   * @param {any} a - First data
   * @param {any} b - Second data
   * @returns {boolean} - True if equal
   */
  static equals(a, b) {
    const bufA = this.toBuffer(a);
    const bufB = this.toBuffer(b);
    return bufA.equals(bufB);
  }

  /**
   * Concatenate multiple data inputs
   * @param {...any} inputs - Data inputs to concatenate
   * @returns {Buffer} - Concatenated buffer
   */
  static concat(...inputs) {
    return Buffer.concat(inputs.map(i => this.toBuffer(i)));
  }

  /**
   * Slice buffer with safety checks
   * @param {any} input - Input data
   * @param {number} start - Start offset
   * @param {number} end - End offset (optional)
   * @returns {Buffer} - Sliced buffer
   */
  static slice(input, start, end) {
    const buf = this.toBuffer(input);
    return buf.slice(Math.max(0, start), end ?? buf.length);
  }

  /**
   * XOR two buffers (for encryption/checksum)
   * @param {any} a - First data
   * @param {any} b - Second data
   * @returns {Buffer} - XOR result
   */
  static xor(a, b) {
    const bufA = this.toBuffer(a);
    const bufB = this.toBuffer(b);
    const result = Buffer.alloc(Math.max(bufA.length, bufB.length));
    for (let i = 0; i < result.length; i++) {
      result[i] = (bufA[i] || 0) ^ (bufB[i] || 0);
    }
    return result;
  }

  /**
   * Calculate simple checksum (sum of all bytes mod 256)
   * @param {any} input - Input data
   * @returns {number} - Checksum byte
   */
  static checksum(input) {
    return this.toArray(input).reduce((sum, b) => (sum + b) & 0xFF, 0);
  }

  /**
   * Reverse byte order
   * @param {any} input - Input data
   * @returns {Buffer} - Reversed buffer
   */
  static reverse(input) {
    return Buffer.from(this.toArray(input).reverse());
  }
}

module.exports = DataConverter;
