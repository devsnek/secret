'use strict';

async function createRawMessage(client, options = {}, { channelID, messageID }) {
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
      embeds: options.embeds,
      allowed_mentions: options.allowedMentions,
      message_reference: messageID ? { message_id: messageID } : undefined,
      flags: options.flags,
    },
    files: options.attachments,
  };
}

module.exports = { createRawMessage };
