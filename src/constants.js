'use strict';

const packageInfo = require('../package');
const { Bitfield } = require('./bitfield');

class GatewayIntents extends Bitfield {}
GatewayIntents.FIELDS = [
  'GUILDS',
  'GUILD_MEMBERS',
  'GUILD_BANS',
  'GUILD_EMOJIS',
  'GUILD_INTEGRATIONS',
  'GUILD_WEBOOKS',
  'GUILD_INVITES',
  'GUILD_VOICE_STATES',
  'GUILD_PRESENCES',
  'GUILD_MESSAGES',
  'GUILD_MESSAGE_REACTIONS',
  'GUILD_MESSAGE_TYPING',
  'DIRECT_MESSAGES',
  'DIRECT_MESSAGE_REACTIONS',
  'DIRECT_MESSAGE_TYPING',
];

const Gateway = {
  VERSION: 10,
  DEVICE: packageInfo.name,
  Intents: GatewayIntents,
  Opcodes: {
    DISPATCH: 0,
    HEARTBEAT: 1,
    IDENTIFY: 2,
    PRESENCE_UPDATE: 3,
    VOICE_STATE_UPDATE: 4,
    RESUME: 6,
    RECONNECT: 7,
    REQUEST_GUILD_MEMBERS: 8,
    INVALID_SESSION: 9,
    HELLO: 10,
    HEARTBEAT_ACK: 11,
  },
};

const Rest = {
  VERSION: 10,
  API: 'https://discord.com/api',
  USER_AGENT: `DiscordBot (${packageInfo.name}, ${packageInfo.version}) Node.js/${process.version}`,
};

const Voice = {
  VERSION: 4,
  SUPPORTED_MODES: [
    'xsalsa20_poly1305_lite',
    'xsalsa20_poly1305_suffix',
    'xsalsa20_poly1305',
  ],
  Opcodes: {
    IDENTIFY: 0,
    SELECT_PROTOCOL: 1,
    READY: 2,
    HEARTBEAT: 3,
    SELECT_PROTOCOL_ACK: 4,
    SPEAKING: 5,
    HEARTBEAT_ACK: 6,
    RESUME: 7,
    HELLO: 8,
    RESUMED: 9,
    VIDEO: 12,
    CLIENT_DISCONNECT: 13,
    SESSION_UPDATE: 14,
    VIDEO_SINK_WANTS: 15,
  },
};

const InteractionTypes = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MESSAGE_COMPONENT: 3,
};

const InteractionCallbackTypes = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE: 5,
  DEFERRED_UPDATE_MESSAGE: 6,
  UPDATE_MESSAGE: 7,
};

const ApplicationCommandOptionTypes = {
  SUB_COMMAND: 1,
  SUB_COMMAND_GROUP: 2,
  STRING: 3,
  INTEGER: 4,
  BOOLEAN: 5,
  USER: 6,
  CHANNEL: 7,
  ROLE: 8,
  MENTIONABLE: 9,
};

module.exports = {
  Gateway,
  Rest,
  Voice,
  InteractionTypes,
  InteractionCallbackTypes,
  ApplicationCommandOptionTypes,
  EPOCH: 1420070400000,
};
