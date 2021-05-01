'use strict';

const stream = require('stream');
const sodium = require('sodium');

const MAX_NONCE = 2 ** 32 - 1;

const staticNonce = Buffer.alloc(24);

class Writable extends stream.Writable {
  constructor(voiceState) {
    super({
      highWaterMark: 12,
    });

    this.voiceState = voiceState;

    this.nonceCount = 0;
    this.nonce = Buffer.alloc(24);

    this.audioSequence = 0;
    this.audioTimestamp = 0;
    this.startTime = 0;
  }

  _write(chunk, encoding, done) {
    if (!this.startTime) {
      this.startTime = Date.now();
    }

    this.voiceState.setSpeaking(true);

    const packet = this.createPacket(chunk);
    this.voiceState.sendUDP(packet);

    const delay = (20 + (this.audioSequence * 20)) - (Date.now() - this.startTime);
    setTimeout(done, delay);

    this.audioSequence += 1;
    if (this.audioSequence >= 2 ** 16) {
      this.audioSequence = 0;
    }
    this.audioTimestamp += (48000 / 100) * 2;
    if (this.audioTimestamp >= 2 ** 32) {
      this.audioTimestamp = 0;
    }
  }

  createPacket(buffer) {
    const packetBuffer = Buffer.alloc(12);
    packetBuffer[0] = 0x80;
    packetBuffer[1] = 0x78;

    packetBuffer.writeUInt16BE(this.audioSequence, 2);
    packetBuffer.writeUInt32BE(this.audioTimestamp, 4);
    packetBuffer.writeUInt32BE(this.voiceState.ssrc, 8);

    packetBuffer.copy(staticNonce, 0, 0, 12);
    return Buffer.concat([packetBuffer, ...this.encrypt(buffer)]);
  }

  encrypt(buffer) {
    switch (this.voiceState.mode) {
      case 'xsalsa20_poly1305_lite':
        this.nonceCount += 1;
        if (this.nonceCount > MAX_NONCE) {
          this.nonceCount = 0;
        }
        this.nonce.writeUInt32BE(this.nonceCount, 0);
        return [
          sodium.api.crypto_secretbox_easy(buffer, this.nonce, this.voiceState.secretKey),
          this.nonce.slice(0, 4),
        ];
      case 'xsalsa20_poly1305_suffix': {
        const random = sodium.randombytes_buf(24);
        return [
          sodium.api.crypto_secretbox_easy(buffer, random, this.voiceState.secretKey),
          random,
        ];
      }
      case 'xsalsa20_poly1305':
        return [sodium.api.crypto_secretbox_easy(buffer, staticNonce, this.voiceState.secretKey)];
      default:
        throw new RangeError(this.voiceState.mode);
    }
  }
}

module.exports = { Writable };
