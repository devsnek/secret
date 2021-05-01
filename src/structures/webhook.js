'use strict';

const { Structure } = require('./structure');
const { Message } = require('./message');
const { Guild } = require('./guild');
const { Channel } = require('./channel');
const { createRawMessage } = require('../message');

class Webhook extends Structure {
  constructor(client, data) {
    super(client, data);

    if (!this.client) {
      const { BaseClient } = require('../client');
      this.client = new BaseClient();
    }
  }

  async sendMessage(options) {
    const raw = await createRawMessage(this.client, options, {
      multiEmbed: true,
    });
    const data = await this.client.rest.post`/webhooks/${this.data.id}/${this.data.token}`({
      authenticate: false,
      query: { wait: true },
      data: raw.data,
      files: raw.files,
    });
    return new Message(this.client, data);
  }

  async getChannel() {
    const data = await this.client.rest.get`/channels/${this.data.channel_id}`();
    return new Channel(this.client, data);
  }

  async getGuild() {
    if (this.data.guild_id) {
      const data = await this.client.rest.get`/guilds/${this.data.guild_id}`();
      return new Guild(this.client, data);
    }
    return undefined;
  }

  async delete({ reason } = {}) {
    await this.client.rest.delete`/webhooks/${this.data.id}/${this.data.token}`({
      authenticate: false,
      reason,
    });
  }
}

module.exports = { Webhook };
