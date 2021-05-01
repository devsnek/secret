'use strict';

const WebSocket = require('ws');
const { createSocket } = require('dgram');
const { Gateway, Voice } = require('../constants');
const { Writable } = require('./writable');
const { Readable } = require('./readable');

const SILENCE_FRAME = Buffer.from([0xF8, 0xFF, 0xFE]);
const UDP_KEEP_ALIVE_INTERVAL = 5000;

const textDecoder = new TextDecoder();

class VoiceState {
  constructor(client, guildID) {
    this.client = client;
    this.guildID = guildID;

    this.ws = undefined;
    this.udp = undefined;

    this.wsEndpoint = undefined;
    this.sessionID = undefined;
    this.token = undefined;
    this.ssrc = undefined;
    this.udpPort = undefined;
    this.udpIP = undefined;
    this.mode = undefined;
    this.secretKey = undefined;

    this.udpKeepAliveInterval = undefined;
    this.speakingState = undefined;

    this.resolveConnect = undefined;

    this.writable = new Writable(this);
    this.readable = new Readable(this);
  }

  async connect(channelID) {
    this.writable.cork();

    if (this.ws) {
      this.disconnect();
    }

    this.client.gateway.forGuild(this.guildID).send({
      op: Gateway.Opcodes.VOICE_STATE_UPDATE,
      d: {
        guild_id: this.guildID,
        channel_id: channelID,
        self_mute: false,
        self_deaf: false,
      },
    });

    const [stateUpdate, serverUpdate] = await Promise.all([
      this.getVoiceStateUpdate(),
      this.getVoiceServerUpdate(),
    ]);

    this.sessionID = stateUpdate.session_id;
    this.token = serverUpdate.token;
    this.wsEndpoint = serverUpdate.endpoint;

    this.connectWS();

    await new Promise((resolve) => {
      this.resolveConnect = resolve;
    });
    this.resolveConnect = undefined;
    this.writable.uncork();
  }

  connectWS() {
    this.ws = new WebSocket(`wss://${this.wsEndpoint}?v=${Voice.VERSION}&encoding=json`);
    this.ws.on('message', this.onWebSocketMessage.bind(this));
    this.ws.onclose = (e) => {
      switch (e.code) {
        case 1000:
        case 4006:
        case 4007:
        case 4009:
          this.mode = undefined;
          this.connectWS();
          break;
        case 1001:
          this.mode = undefined;
          break;
        case 4010:
        case 4011:
        case 4013:
        case 4014:
          throw new Error(e.reason);
        default:
          this.connectWS();
          break;
      }
    };
  }

  disconnect() {
    try {
      this.ws.close(1001);
    } catch {
      // nothing
    }
    this.ws = undefined;

    if (this.udpKeepAliveInterval !== undefined) {
      clearInterval(this.udpKeepAliveInterval);
      this.udpKeepAliveInterval = undefined;
    }

    try {
      this.udp.close();
    } catch {
      // nothing
    }
    this.udp = undefined;
  }

  getVoiceStateUpdate() {
    return new Promise((resolve, reject) => {
      const voiceStateUpdate = (d) => {
        if (d.data.user_id === this.client.user.data.id) {
          this.client.off('VOICE_STATE_UPDATE', voiceStateUpdate);
          resolve(d.data);
        }
      };
      this.client.on('VOICE_STATE_UPDATE', voiceStateUpdate);
      setTimeout(() => {
        this.client.off('VOICE_STATE_UPDATE', voiceStateUpdate);
        reject(new Error('VOICE_STATE_UPDATE timed out'));
      }, 10000);
    });
  }

  getVoiceServerUpdate() {
    return new Promise((resolve, reject) => {
      const voiceServerUpdate = (d) => {
        if (d.data.guild_id === this.guildID) {
          this.client.off('VOICE_SERVER_UPDATE', voiceServerUpdate);
          resolve(d.data);
        }
      };
      this.client.on('VOICE_SERVER_UPDATE', voiceServerUpdate);
      setTimeout(() => {
        this.client.off('VOICE_SERVER_UPDATE', voiceServerUpdate);
        reject(new Error('VOICE_SERVER_UPDATE timed out'));
      }, 10000);
    });
  }

  sendWS(data) {
    this.ws.send(JSON.stringify(data));
  }

  sendUDP(packet) {
    this.udp.send(packet, 0, packet.length, this.udpPort, this.udpIP);
  }

  onWebSocketMessage(message) {
    const data = JSON.parse(message);
    switch (data.op) {
      case Voice.Opcodes.HELLO: {
        setInterval(() => {
          this.sendWS({
            op: Voice.Opcodes.HEARTBEAT,
            d: Math.floor(Math.random() * 10e10),
          });
        }, data.d.heartbeat_interval);
        if (this.mode) {
          this.sendWS({
            op: Voice.Opcodes.RESUME,
            d: {
              server_id: this.guildID,
              session_id: this.sessionID,
              token: this.token,
            },
          });
        } else {
          this.sendWS({
            op: Voice.Opcodes.IDENTIFY,
            d: {
              server_id: this.guildID,
              user_id: this.client.user.data.id,
              session_id: this.sessionID,
              token: this.token,
            },
          });
        }
        break;
      }
      case Voice.Opcodes.READY: {
        this.udpPort = data.d.port;
        this.udpIP = data.d.ip;
        this.ssrc = data.d.ssrc;

        this.mode = data.d.modes.find((m) => Voice.SUPPORTED_MODES.includes(m));
        if (!this.mode) {
          throw new Error('Unable to select voice mode');
        }

        this.udp = createSocket('udp4');

        this.udp.once('message', (packet) => {
          const nil = packet.indexOf(0, 8);
          const address = textDecoder.decode(packet.subarray(8, nil));
          const port = packet.readUInt16BE(72);

          this.sendWS({
            op: Voice.Opcodes.SELECT_PROTOCOL,
            d: {
              protocol: 'udp',
              data: {
                address,
                port,
                mode: this.mode,
              },
            },
          });

          this.udp.on('message', this.onUDPMessage.bind(this));

          this.udpKeepAliveInterval = setInterval(() => {
            const p = Buffer.alloc(8);
            p.writeUIntLE(Date.now(), 0, 6);
            this.sendUDP(p);
          }, UDP_KEEP_ALIVE_INTERVAL);
        });

        const echo = Buffer.alloc(74);
        echo.writeUInt16BE(1, 0);
        echo.writeUInt16BE(70, 2);
        echo.writeUInt32BE(this.ssrc, 4);
        this.sendUDP(echo);
        break;
      }
      case Voice.Opcodes.SELECT_PROTOCOL_ACK:
        this.secretKey = Buffer.from(data.d.secret_key);
        this.writable.write(SILENCE_FRAME);
        if (this.resolveConnect) {
          this.resolveConnect();
        }
        this.setSpeaking(false);
        break;
      case Voice.Opcodes.RESUMED:
        break;
      case Voice.Opcodes.SPEAKING:
        this.readable.connect(data.d.ssrc, data.d.user_id);
        break;
      case Voice.Opcodes.VIDEO:
        this.readable.connect(data.d.audio_ssrc, data.d.user_id);
        break;
      case Voice.Opcodes.CLIENT_DISCONNECT:
        this.readable.disconnect(data.d.audio_ssrc);
        break;
      case Voice.Opcodes.HEARTBEAT_ACK:
        break;
      default:
        break;
    }
  }

  onUDPMessage(packet) {
    if (packet.length === 8) {
      return;
    }

    this.readable.onPacket(packet);
  }

  setSpeaking(speaking) {
    if (speaking === this.speakingState) {
      return;
    }
    this.speakingState = speaking;
    this.sendWS({
      op: Voice.Opcodes.SPEAKING,
      d: {
        speaking: speaking ? 1 : 0,
        delay: 0,
        ssrc: this.ssrc,
      },
    });
  }
}

module.exports = { VoiceState };
