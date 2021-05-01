'use strict';

const sodium = require('sodium');
const stream = require('stream');

class Readable {
  constructor(voiceState) {
    this.voiceState = voiceState;

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
    const ssrc = packet.readUint32BE(0);
    const entry = this.ssrcMap.get(ssrc);
    if (!entry?.stream) {
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
      offset += 1;

      data = data.slice(offset);
    }

    entry.stream.push(data);
  }

  get(user) {
    const userID = user.id || user;
    for (const [, entry] of this.ssrcMap) {
      if (entry.userID === userID) {
        if (!entry.stream) {
          entry.stream = new stream.Readable({ read() {} });
        }
        return entry.stream;
      }
    }
    return undefined;
  }

  connect(ssrc, userID) {
    this.ssrcMap.set(ssrc, {
      userID,
      stream: undefined,
    });
  }

  disconnect(ssrc) {
    if (this.ssrcMap.has(ssrc)) {
      const entry = this.ssrcMap.get(ssrc);
      if (entry.stream) {
        entry.stream.push(null);
      }
    }
    this.ssrcMap.delete(ssrc);
  }
}

module.exports = { Readable };
