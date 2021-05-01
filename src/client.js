'use strict';

const crypto = require('crypto');
const { EventEmitter } = require('events');
const { InteractionTypes, InteractionCallbackTypes } = require('./constants');
const { Gateway } = require('./gateway');
const { Rest } = require('./rest');
const { Channel } = require('./structures/channel');
const { Interaction } = require('./structures/interaction');

class BaseClient extends EventEmitter {
  constructor({ token }) {
    super();
    this.token = token;
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

  async login() {
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

    this.on('GUILD_DELETE', (guild) => {
      if (!guild.data.unavailable) {
        this.voiceStates.delete(guild.data.id);
      }
    });
  }

  async login() {
    await super.login();
    await this.gateway.connect();
  }
}

class InteractionClient extends BaseClient {
  constructor(options) {
    super(options);

    this.publicKey = crypto.webcrypto.subtle.importKey(
      'raw',
      Buffer.from(options.publicKey, 'hex'),
      {
        name: 'NODE-ED25519',
        namedCurve: 'NODE-ED25519',
        public: true,
      },
      true,
      ['verify'],
    );
  }

  async verify(signature, body, timestamp) {
    signature = Buffer.from(signature);
    const unknown = Buffer.concat([Buffer.from(timestamp), Buffer.from(body)]);
    const publicKey = await this.publicKey;
    const v = await crypto.webcrypto.subtle.verify('NODE-ED25519', publicKey, signature, unknown);
    return v;
  }

  async handle(signature, body, timestamp) {
    if (!await this.verify(signature, body, timestamp)) {
      throw new Error('Invalid payload');
    }

    const data = JSON.parse(body.toString('utf8'));

    if (data.type === InteractionTypes.PING) {
      return {
        type: InteractionCallbackTypes.PONG,
      };
    }

    const result = await new Promise((resolve) => {
      const interaction = new Interaction(this, data, {
        reply: resolve,
      });
      this.emit('INTERACTION_CREATE', interaction);
    });

    return result;
  }
}

module.exports = {
  BaseClient,
  GatewayClient,
  InteractionClient,
};
