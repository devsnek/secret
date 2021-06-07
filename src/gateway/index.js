'use strict';

const { setTimeout } = require('timers/promises');

const { GatewaySocket } = require('./socket');
const { Gateway: { Intents } } = require('../constants');

class Gateway {
  constructor(client, intents) {
    this.client = client;
    this.intents = new Intents(intents);
    this.shardCount = -1;
    this.maxConcurrency = Infinity;
    this.shards = [];
    this.chain = Promise.resolve();
    this.remaining = 1;
  }

  spawnShard(i) {
    this.chain = this.chain.then(async () => {
      if (this.remaining <= 0) {
        await setTimeout(5000);
        this.remaining = this.maxConcurrency;
      }
      this.shards[i] = new GatewaySocket(this, i);
      this.shards[i].connect();
      this.remaining -= 1;
    });
  }

  forGuild(id) {
    const shardID = Number(BigInt(id) >> 22n) % this.shardCount;
    return this.shards[shardID];
  }

  async connect() {
    if (this.maxConcurrency === Infinity) {
      const data = await this.client.rest.get`/gateway/bot`();
      this.shardCount = data.shards;
      this.maxConcurrency = data.session_start_limit.max_concurrency;
      this.remaining = this.maxConcurrency;
    }
    this.shards = Array.from({ length: this.shardCount }, (_, i) => {
      this.spawnShard(i);
      return undefined;
    });
  }
}

module.exports = { Gateway };
