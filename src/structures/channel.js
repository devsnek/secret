'use strict';

const { Structure } = require('./structure');
const { createRawMessage } = require('../message');

class Channel extends Structure {
  async sendMessage(options) {
    const raw = await createRawMessage(this.client, options, {
      channelID: this.data.id,
      multiEmbed: false,
    });
    const data = await this.client.rest.post`/channels/${this.data.id}/messages`({
      data: raw.data,
      files: raw.files,
    });
    const { Message } = require('./message');
    return new Message(this.client, data);
  }

  async getParent() {
    if (this.data.parent_id) {
      const data = await this.client.rest.get`/channels/${this.data.parent_id}`();
      return new Channel(this.client, data);
    }
    return undefined;
  }

  async getGuild() {
    if (this.data.guild_id) {
      const { Guild } = require('./guild');
      const data = await this.client.rest.get`/guilds/${this.data.guild_id}`();
      return new Guild(this.client, data);
    }
    return undefined;
  }

  async getThreadMembers() {
    const data = await this.client.rest.get`/channels/${this.data.id}/thread-members`();
    return data.map((d) => new Structure(this.client, d));
  }

  async getActiveThreads() {
    const data = await this.client.rest.get`/channels/${this.data.id}/threads/active`();
    return data.map((d) => new Channel(this.client, d));
  }

  async getArchivedPublicThreads() {
    const data = await this.client.rest.get`/channels/${this.data.id}/threads/archived/public`();
    return data.map((d) => new Channel(this.client, d));
  }

  async getArchivedPrivateThreads() {
    const data = await this.client.rest.get`/channels/${this.data.id}/threads/archived/private`();
    return data.map((d) => new Channel(this.client, d));
  }

  async delete() {
    await this.client.rest.delete`/channels/${this.data.id}`();
  }

  async join() {
    const { VoiceState } = require('../voice');
    if (!this.client.voiceStates.has(this.data.guild_id)) {
      const state = new VoiceState(this.client, this.data.guild_id);
      this.client.voiceStates.set(this.data.guild_id, state);
    }
    const state = this.client.voiceStates.get(this.data.guild_id);
    await state.connect(this.data.id);
    return state;
  }

  async createWebhook(options) {
    const { Webhook } = require('./webhook');
    const data = await this.client.rest.post`/channels/${this.data.id}/webhooks`({
      data: options,
      reason: options.reason,
    });
    return new Webhook(this.client, data);
  }

  toMention() {
    return `<#${this.data.id}>`;
  }
}

module.exports = { Channel };
