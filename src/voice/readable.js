'use strict';

const sodium = require('sodium');
const { Readable: StreamReadable } = require('stream');

class Readable {
  constructor(voiceState) {
    this.voiceState = voiceState;

    this.streamMap = new Map();
    this.ssrcMap = new Map();
    this.nonce = Buffer.alloc(24);
  }

  decrypt(buffer) {
    let end;
    switch (this.voiceState.mode) {
      case 'xsalsa20_poly1305_lite':
        buffer.copy(this.nonce, 0, buffer.length - 4);
        end = buffer.length - 4;
        break;
      case 'xsalsa20_poly1305_suffix':
        buffer.copy(this.nonce, 0, buffer.length - 24);
        end = buffer.length - 24;
        break;
      case 'xsalsa20_poly1305':
        buffer.copy(this.nonce, 0, 0, 12);
        end = buffer.length;
        break;
      default:
        throw new RangeError(this.voiceState.mode);
    }

    const data = sodium.api.crypto_secretbox_open_easy(
      buffer.slice(12, end),
      this.nonce,
      this.voiceState.secretKey,
    );
    if (!data) {
      throw new Error('failed to decrypt audio data');
    }

    return data;
  }

  onPacket(packet) {
    const ssrc = packet.readUint32BE(8);
    const userID = this.ssrcMap.get(ssrc);
    if (!userID) {
      return;
    }
    const stream = this.streamMap.get(userID);
    if (!stream) {
      return;
    }

    let data = this.decrypt(packet);

    if (data[0] === 0xBE && data[1] === 0xDE && data.length > 4) {
      const headerExtensionLength = data.readUInt16BE(2);
      let offset = 4;
      for (let i = 0; i < headerExtensionLength; i += 1) {
        const byte = data[offset];
        offset += 1;
        if (byte === 0) {
          continue; // eslint-disable-line no-continue
        }
        offset += 1 + (0b1111 & (byte >> 4));
      }
      if (data[offset] === 0x00 || data[offset] === 0x02) {
        offset += 1;
      }

      data = data.slice(offset);
    }

    stream.push(data);
  }

  get(userID) {
    if (!this.streamMap.has(userID)) {
      this.streamMap.set(userID, new StreamReadable({ read() {} }));
    }
    return this.streamMap.get(userID);
  }

  connect(ssrc, userID) {
    this.ssrcMap.set(ssrc, userID);
  }

  disconnect(ssrc) {
    const userID = this.ssrcMap.get(ssrc);
    if (userID) {
      this.ssrcMap.delete(ssrc);
      const stream = this.streamMap.get(userID);
      if (stream) {
        this.streamMap.delete(userID);
        stream.push(null);
      }
    }
  }
}

module.exports = { Readable };
