'use strict';

const { EventEmitter } = require('events');
const { Rest } = require('../rest');
const { Channel } = require('../structures/channel');

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

module.exports = { BaseClient };
