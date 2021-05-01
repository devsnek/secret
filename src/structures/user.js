'use strict';

const { Structure } = require('./structure');

class User extends Structure {
  get tag() {
    return `${this.data.username}#${this.data.discriminator}`;
  }

  toMention() {
    return `<@!${this.data.id}>`;
  }
}

module.exports = { User };
