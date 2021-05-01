'use strict';

const { Structure } = require('./structure');
const { User } = require('./user');
const { Guild } = require('./guild');
const { Channel } = require('./channel');
const { createRawMessage } = require('../message');

class Message extends Structure {
  constructor(client, data) {
    super(client, data);

    this.author = data.author ? new User(this.client, this.data.author) : undefined;
  }

  async reply(options) {
    const raw = await createRawMessage(this.client, options, {
      channelID: this.data.channel_id,
      messageID: this.id,
      multiEmbed: !!this.data.webhook_id,
    });
    if (this.data.webhook_id) {
      const hook = await this.client.rest.get`/webhooks/${this.data.webhook_id}`();
      const data = await this.client.rest.post`/webhooks/${hook.id}/${hook.token}`({
        authenticate: false,
        data: raw.data,
        files: raw.files,
      });
      return new Message(this.client, data);
    }
    const data = await this.client.rest.post`/channels/${this.data.channel_id}/messages`({
      data: raw.data,
      files: raw.files,
    });
    return new Message(this.client, data);
  }

  async getChannel() {
    const data = await this.client.rest.get`/channels/${this.data.channel_id}`();
    return new Channel(this.client, data);
  }

  async delete() {
    await this.client.rest.delete`/channels/${this.data.channel_id}/messages/${this.data.id}`();
  }

  async setPinned(pinned) {
    if (pinned) {
      await this.client.rest.put`/channels/${this.data.channel_id}/pins/${this.data.id}`();
    } else {
      await this.client.rest.delete`/channels/${this.data.channel_id}/pins/${this.data.id}`();
    }
  }

  async getGuild() {
    const data = await this.client.rest.get`/guilds/${this.data.guild_id}`();
    return new Guild(this.client, data);
  }
}

module.exports = { Message };
