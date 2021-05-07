'use strict';

const { Gateway } = require('../gateway');
const { BaseClient } = require('./base');
const { ApplicationCommandBuilder } = require('./interaction');

class GatewayClient extends BaseClient {
  constructor(options) {
    super(options);

    this.gateway = new Gateway(this, options.intents);
    this.voiceStates = new Map();

    this.commands = new ApplicationCommandBuilder(this);

    this.user = undefined;

    this.on('GUILD_DELETE', (guild) => {
      if (!guild.data.unavailable) {
        this.voiceStates.delete(guild.data.id);
      }
    });
  }

  async login() {
    await super.login();
    await Promise.all([
      this.commands.announce(),
      this.gateway.connect(),
    ]);
  }
}

module.exports = { GatewayClient };
