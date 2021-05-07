'use strict';

const { Structure } = require('./structure');
const { User } = require('./user');

class GuildMember extends Structure {
  constructor(client, data) {
    super(client, data);

    this.user = data.user ? new User(client, data.user) : null;
  }
}

module.exports = { GuildMember };
