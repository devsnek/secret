'use strict';

async function createRawMessage(client, options = {}, { channelID, messageID, multiEmbed }) {
  if (typeof options.then === 'function') {
    if (channelID) {
      await this.client.rest.post`/channels/${channelID}/typing`();
    }
    options = await options;
  }

  const { attachments, ...optionsWithoutAttachments } = options;

  return {
    data: {
      ...optionsWithoutAttachments,
      content: options.content,
      nonce: options.nonce,
      tts: options.tts,
      embed: multiEmbed ? undefined : options.embed,
      embeds: multiEmbed ? options.embeds : undefined,
      allowed_mentions: options.allowedMentions,
      message_reference: messageID ? { message_id: messageID } : undefined,
      flags: options.flags,
    },
    files: options.attachments,
  };
}

module.exports = { createRawMessage };
