'use strict';

const { EventEmitter } = require('events');
const { Gateway } = require('./gateway');
const { Rest } = require('./rest');
const { Channel } = require('./structures/channel');

class BaseClient extends EventEmitter {
  constructor() {
    super();
    this.token = undefined;
    this.applicationID = undefined;
    this.rest = new Rest(this);
  }

  async getChannel(id) {
    const data = await this.rest.get`/channels/${id}`();
    return new Channel(this, data);
  }

  async login(token) {
    this.token = token;
    await this.gateway.connect();
  }
}

class GatewayClient extends BaseClient {
  constructor(options) {
    super(options);

    this.gateway = new Gateway(this, options.intents);
    this.voiceStates = new Map();
  }
}

class InteractionClient extends BaseClient {
}

module.exports = {
  BaseClient,
  GatewayClient,
  InteractionClient,
};
