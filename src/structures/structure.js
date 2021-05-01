'use strict';

const { EPOCH } = require('../constants');

class Structure {
  constructor(client, data) {
    this.client = client;
    this.data = data;

    if (data.id) {
      this.createdAt = Number((BigInt(data.id) >> 22n) + BigInt(EPOCH));
    }
  }
}

module.exports = { Structure };
