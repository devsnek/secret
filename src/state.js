'use strict';

const EVENTS = [];

class State {
  constructor(client) {
    this.client = client;

    this.voice = new Map();

    EVENTS.forEach(({ method, event }) => {
      this.client.on(event, this[method].bind(this));
    });
  }
}

Object.getOwnPropertyNames(State.prototype).forEach((m) => {
  if (!m.startsWith?.('on')) {
    return;
  }

  EVENTS.push({
    method: m,
    event: m.replace(/[A-Z]/g, (l) => `_${l}`).slice(3).toUpperCase(),
  });
});

module.exports = { State };
