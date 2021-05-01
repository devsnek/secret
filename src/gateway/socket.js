'use strict';

const WebSocket = require('ws');
const zlib = require('zlib-sync');

const { User } = require('../structures/user');
const { Gateway } = require('../constants');
const { transform } = require('./events');

class GatewaySocket {
  constructor(gateway, shardID) {
    this.gateway = gateway;
    this.client = gateway.client;
    this.shardID = shardID;

    this.inflate = undefined;
    this.socket = undefined;
    this.sequence = -1;
    this.sessionID = undefined;
    this.lastHeartbeatAcked = false;
  }

  connect() {
    this.disconnect();
    this.inflate = new zlib.Inflate({
      chunkSize: 65535,
      flush: zlib.Z_SYNC_FLUSH,
    });
    this.socket = new WebSocket(`${this.gateway.endpoint}?v=${Gateway.VERSION}&encoding=json&compress=zlib-stream`);
    this.socket.onopen = this.onOpen.bind(this);
    this.socket.onmessage = this.onMessage.bind(this);
    this.socket.onerror = this.onError.bind(this);
    this.socket.onclose = this.onClose.bind(this);
  }

  disconnect(code = 4009) {
    clearInterval(this.heartbeatInterval);
    if (this.socket) {
      try {
        this.socket.close(code);
      } catch {
        // nothing
      }
      this.socket = undefined;
    }
  }

  onOpen() {}

  onMessage({ data }) {
    if (data instanceof ArrayBuffer) {
      data = Buffer.from(data);
    }
    const flush = data.length >= 4 && data.readUint32BE(data.length - 4) === 0x0000FFFF;
    this.inflate.push(data, flush && zlib.Z_SYNC_FLUSH);
    if (!flush) {
      return;
    }
    this.onPacket(JSON.parse(this.inflate.result));
  }

  onError() {}

  onClose(e) {
    switch (e.code) {
      case 1000:
      case 4006:
      case 4007:
      case 4009:
        this.gateway.spawnShard(this.shardID);
        break;
      case 4010:
      case 4011:
      case 4013:
      case 4014:
        throw new Error(e.reason);
      default:
        this.connect();
        break;
    }
  }

  send(data) {
    this.socket.send(JSON.stringify(data));
  }

  onPacket(packet) {
    if (packet.s > this.seqence) {
      this.sequence = packet.s;
    }

    switch (packet.op) {
      case Gateway.Opcodes.HELLO:
        this.lastHeartbeatAcked = true;
        this.heartbeatInterval = setInterval(() => {
          if (!this.lastHeartbeatAcked) {
            this.connect();
          } else {
            this.lastHeartbeatAcked = false;
            this.send({ op: Gateway.Opcodes.HEARTBEAT, d: this.sequence });
          }
        }, packet.d.heartbeat_interval);
        if (this.sessionID) {
          this.send({
            op: Gateway.Opcodes.RESUME,
            d: {
              token: this.client.token,
              session_id: this.sessionID,
              seq: this.sequence,
            },
          });
        } else {
          this.send({
            op: Gateway.Opcodes.IDENTIFY,
            d: {
              token: this.client.token,
              intents: this.gateway.intents.value,
              properties: {
                $os: process.platform,
                $device: Gateway.DEVICE,
                $browser: Gateway.DEVICE,
              },
              shard: [this.shardID, this.gateway.shardCount],
            },
          });
        }
        break;
      case Gateway.Opcodes.RECONNECT:
        if (this.sessionID) {
          this.connect();
        } else {
          this.gateway.spawnShard(this.shardID);
        }
        break;
      case Gateway.Opcodes.INVALID_SESSION:
        if (packet.d && this.sessionID) {
          this.send({
            op: Gateway.Opcodes.RESUME,
            d: {
              token: this.client.token,
              session_id: this.sessionID,
              seq: this.sequence,
            },
          });
        } else {
          this.gateway.spawnShard(this.shardID);
        }
        break;
      case Gateway.Opcodes.DISPATCH:
        switch (packet.t) {
          case 'READY':
            this.sessionID = packet.d.session_id;
            this.client.user = new User(this.client, packet.d.user);
            this.client.emit(packet.t, transform(this.client, packet.t, packet.d));
            break;
          default:
            this.client.emit(packet.t, transform(this.client, packet.t, packet.d));
            break;
        }
        break;
      case Gateway.Opcodes.HEARTBEAT_ACK:
        this.lastHeartbeatAcked = true;
        break;
      default:
        break;
    }
  }
}

module.exports = { GatewaySocket };
