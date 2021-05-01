'use strict';

const {
  Structure,
  Channel,
  Guild,
  GuildMember,
  Message,
  Interaction,
  User,
} = require('../structures');

function transform(client, type, data) {
  switch (type) {
    case 'CHANNEL_CREATE':
    case 'CHANNEL_UPDATE':
    case 'CHANNEL_DELETE':
      return new Channel(client, data);
    case 'THREAD_CREATE':
    case 'THREAD_UPDATE':
    case 'THREAD_DELETE':
      return new Channel(client, data);
    case 'GUILD_CREATE':
    case 'GUILD_UPDATE':
    case 'GUILD_DELETE':
      return new Guild(client, data);
    case 'GUILD_MEMBER_ADD':
    case 'GUILD_MEMBER_REMOVE':
    case 'GUILD_MEMBER_UPDATE':
      return new GuildMember(client, data);
    /*
    case 'GUILD_ROLE_CREATE':
    case 'GUILD_ROLE_UPDATE':
    case 'GUILD_ROLE_DELETE':
      return new GuildRole(client, data);
    */
    case 'INTERACTION_CREATE':
      return new Interaction(client, data);
    case 'MESSAGE_CREATE':
    case 'MESSAGE_UPDATE':
    case 'MESSAGE_DELETE':
      return new Message(client, data);
    case 'USER_UPDATE':
      return new User(client, data);
    default:
      return new Structure(client, data);
  }
}

module.exports = { transform };
