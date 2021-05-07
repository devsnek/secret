'use strict';

const { EPOCH } = require('../constants');

class Structure {
  constructor(client, data) {
    Object.defineProperty(this, 'client', {
      value: client,
      writable: true,
      enumerable: false,
      configurable: true,
    });
    this.data = data;

    if (data.id) {
      this.createdAt = Number((BigInt(data.id) >> 22n) + BigInt(EPOCH));
    }
  }
}

module.exports = { Structure };
