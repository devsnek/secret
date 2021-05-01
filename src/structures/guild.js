'use strict';

const { Channel } = require('./channel');
const { Structure } = require('./structure');

class Guild extends Structure {
  async getChannels() {
    const data = this.data.channels || await this.client.rest.get`/guilds/${this.data.id}/channels`();
    return data.map((c) => new Channel(this.client, c));
  }
}

module.exports = { Guild };
