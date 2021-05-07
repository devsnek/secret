'use strict';

class APIError extends Error {
  constructor(response, body) {
    super(response.statusText || 'Invalid response');
    this.response = response;

    if (body.code === 50035 && body.errors) {
      this.errors = body.errors;
    } else {
      this.body = body;
    }
  }
}

module.exports = { APIError };
