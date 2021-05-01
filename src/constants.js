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
  VERSION: 8,
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
  VERSION: 9,
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

module.exports = {
  Gateway,
  Rest,
  Voice,
  EPOCH: 1420070400000,
};
