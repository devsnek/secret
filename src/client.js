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

  async setApplicationCommands(commands) {
    await this.rest.put`/applications/${this.applicationID}/commands`({
      data: commands,
    });
  }

  async login(token) {
    this.token = token;

    const app = await this.rest.get`/oauth2/applications/@me`();
    this.applicationID = app.id;
  }
}

class GatewayClient extends BaseClient {
  constructor(options) {
    super(options);

    this.gateway = new Gateway(this, options.intents);
    this.user = undefined;
    this.voiceStates = new Map();
  }

  async login(token) {
    await super.login(token);
    await this.gateway.connect();
  }
}

class InteractionClient extends BaseClient {
}

module.exports = {
  BaseClient,
  GatewayClient,
  InteractionClient,
};
