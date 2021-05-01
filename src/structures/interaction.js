'use strict';

const { Structure } = require('./structure');
const { Channel } = require('./channel');
const { Guild } = require('./guild');
const { GuildMember } = require('./guild_member');
const { Message } = require('./message');
const { User } = require('./user');
const { Webhook } = require('./webhook');

class Interaction extends Structure {
  constructor(client, data, syncHandle) {
    super(client, data);

    this.webhook = new Webhook(client, {
      id: data.application_id,
      token: data.token,
    });
    this.user = data.user ? new User(client, data.user) : null;
    this.member = data.member ? new GuildMember(client, data.member) : null;
    this.message = data.message ? new Message(client, data.message) : null;

    this.syncHandle = syncHandle;
  }

  async reply(data) {
    if (this.syncHandle) {
      await this.syncHandle.reply(data);
    } else {
      await this.client.rest.post`/interactions/${this.data.id}/${this.data.token}/callback`({
        data,
      });
    }
  }

  async getChannel() {
    const data = await this.client.rest.get`/channels/${this.data.channel_id}`();
    return new Channel(this.client, data);
  }

  async getGuild() {
    const data = await this.client.rest.get`/guilds/${this.data.guild_id}`();
    return new Guild(this.client, data);
  }
}

module.exports = { Interaction };
