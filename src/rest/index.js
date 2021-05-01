'use strict';

const { METHODS } = require('http');
const https = require('https');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { setTimeout } = require('timers/promises');

const { Rest: { API, VERSION, USER_AGENT } } = require('../constants');

const agent = new https.Agent({ keepAlive: true });

class Bucket {
  constructor(rest) {
    this.rest = rest;
    this.reset = Infinity;
    this.remaining = 1;
    this.limit = -1;
    this.resetAfter = -1;
  }

  get limited() {
    return this.remaining <= 0 && Date.now() < this.reset;
  }

  update(r) {
    const serverDate = r.headers.get('date');
    const limit = r.headers.get('x-ratelimit-limit');
    const remaining = r.headers.get('x-ratelimit-remaining');
    const reset = r.headers.get('x-ratelimit-reset');
    const resetAfter = r.headers.get('x-ratelimit-reset-after');

    this.limit = limit ? Number(limit) : Infinity;
    this.remaining = remaining ? Number(remaining) : 1;
    this.reset = reset
      ? new Date(Number(reset) * 1000).getTime() - (new Date(serverDate).getTime() - Date.now())
      : Date.now();
    this.resetAfter = resetAfter ? Number(resetAfter * 1000) : -1;
  }
}

class SequentialBucket extends Bucket {
  constructor(...args) {
    super(...args);
    this.chain = Promise.resolve();
  }

  queue(request) {
    return new Promise((resolve, reject) => {
      this.chain = this.chain.then(async () => {
        if (this.rest.limited) {
          await this.rest.limited;
        }
        if (this.limited) {
          await setTimeout(this.resetAfter);
        }
        await this.rest.makeRequest(request)
          .then(resolve, reject);
      });
    });
  }
}

class Rest {
  constructor(client) {
    this.client = client;
    this.routes = new Map();
    this.buckets = new Map();
    this.limited = undefined;
  }

  async makeRequest({ method, path, options, route }) {
    let query = '';
    if (options.query) {
      query = new URLSearchParams(options.query).toString();
    }
    const url = `${API}/v${VERSION}${path}${query ? `?${query}` : ''}`;

    const headers = {
      'User-Agent': USER_AGENT,
    };
    if (options.authenticate !== false) {
      headers.Authorization = `Bot ${this.client.token}`;
    }
    if (options.reason) {
      headers['X-Audit-Log-Reason'] = options.reason;
    }
    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    let body;
    if (options.files?.length > 0) {
      body = new FormData();
      options.files.forEach((file) => {
        body.append(file.name, file.data, file.name);
      });
      if (options.data) {
        body.append('payload_json', JSON.stringify(options.data));
      }
      Object.assign(headers, body.getHeaders());
    } else if (options.data) {
      body = JSON.stringify(options.data);
      headers['Content-Type'] = 'application/json';
    }

    const r = await fetch(url, {
      agent,
      method,
      headers,
      body,
    });

    if (r.status === 429) {
      // eslint-disable-next-line no-console
      console.warn('[DISCORD] 429', route);
    }

    const rbody = r.headers.get('content-type') === 'application/json'
      ? await r.json()
      : await r.text();

    if (r.headers.get('x-ratelimit-global')) {
      this.limited = setTimeout(rbody.retry_after * 1000).then(() => {
        this.limited = undefined;
      });
    }

    const bucketHash = r.headers.get('x-ratelimit-bucket');

    if (!this.buckets.has(bucketHash)) {
      this.buckets.set(bucketHash, this.routes.get(route));
    }
    this.routes.set(route, this.buckets.get(bucketHash));
    const bucket = this.routes.get(route);

    bucket.update(r);

    if (!r.ok) {
      const e = new Error(r.statusText || 'Invalid response');
      e.response = r;
      e.body = rbody;
      throw e;
    }

    return rbody;
  }

  queueRequest(method, route, path, options = {}) {
    const request = {
      method,
      route,
      path,
      options,
    };

    if (!this.routes.has(route)) {
      this.routes.set(route, new SequentialBucket(this));
    }
    return this.routes.get(route).queue(request);
  }
}

METHODS.forEach((m) => {
  Rest.prototype[m.toLowerCase()] = function request(strings, ...args) {
    let route = `${m}:`;
    strings.forEach((s, i) => {
      route += s;
      if (i === 0 && (
        s === '/channels/'
        || s === '/guilds/'
        || s === '/webhooks/'
      )) {
        route += args[i];
      } else if (i !== strings.length - 1) {
        route += ':id';
      }
    });
    const built = String.raw(strings, ...args);
    return this.queueRequest.bind(this, m, route, built);
  };
});

module.exports = { Rest };
