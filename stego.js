// stego.js - LSB steganography core (browser + node, no deps).
// Hides UTF-8 text in the least significant bit of RGB channels of image pixels.
// Format: 32-bit big-endian byte length header, then payload bits.
(function (root) {
  'use strict';
  var BITS_PER_PIXEL = 3; // R,G,B (alpha untouched)

  function bytesToBits(bytes) {
    var bits = new Array(bytes.length * 8);
    for (var i = 0; i < bytes.length; i++)
      for (var b = 0; b < 8; b++) bits[i * 8 + b] = (bytes[i] >> (7 - b)) & 1;
    return bits;
  }
  function bitsToBytes(bits) {
    var bytes = new Uint8Array(bits.length >> 3);
    for (var i = 0; i < bytes.length; i++) {
      var v = 0;
      for (var b = 0; b < 8; b++) v = (v << 1) | bits[i * 8 + b];
      bytes[i] = v;
    }
    return bytes;
  }
  function utf8encode(s) {
    return new TextEncoder().encode(s);
  }
  function utf8decode(b) {
    return new TextDecoder('utf-8', { fatal: false }).decode(b);
  }
  function capacityBytes(pixelCount) {
    // bits available = pixels*3; header takes 32 bits
    return Math.floor((pixelCount * BITS_PER_PIXEL - 32) / 8);
  }
  // imageData: {data: Uint8ClampedArray RGBA, width, height}
  function encode(imageData, message) {
    var payload = utf8encode(message);
    var pixels = imageData.width * imageData.height;
    var cap = capacityBytes(pixels);
    if (payload.length > cap)
      throw new Error('Message too long: ' + payload.length + ' bytes > capacity ' + cap);
    var header = new Uint8Array(4);
    header[0] = (payload.length >>> 24) & 255;
    header[1] = (payload.length >>> 16) & 255;
    header[2] = (payload.length >>> 8) & 255;
    header[3] = payload.length & 255;
    var bits = bytesToBits(header).concat(bytesToBits(payload));
    var data = imageData.data;
    var bi = 0;
    for (var p = 0; p < pixels && bi < bits.length; p++) {
      for (var c = 0; c < 3 && bi < bits.length; c++) {
        var idx = p * 4 + c;
        data[idx] = (data[idx] & 0xfe) | bits[bi++];
      }
    }
    return imageData;
  }
  function decode(imageData) {
    var data = imageData.data;
    var pixels = imageData.width * imageData.height;
    function readBits(n, offset) {
      var bits = new Array(n);
      for (var i = 0; i < n; i++) {
        var flat = offset + i;
        var p = Math.floor(flat / BITS_PER_PIXEL);
        var c = flat % BITS_PER_PIXEL;
        bits[i] = data[p * 4 + c] & 1;
      }
      return bits;
    }
    var header = bitsToBytes(readBits(32, 0));
    var len = ((header[0] << 24) | (header[1] << 16) | (header[2] << 8) | header[3]) >>> 0;
    if (len > capacityBytes(pixels)) throw new Error('No valid hidden message found');
    if (len === 0) return '';
    return utf8decode(bitsToBytes(readBits(len * 8, 32)));
  }
  root.Stego = { encode: encode, decode: decode, capacityBytes: capacityBytes };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Stego;
})(typeof self !== 'undefined' ? self : this);
