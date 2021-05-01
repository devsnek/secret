'use strict';

const fs = require('fs');

fs.readdirSync(__dirname)
  .forEach((d) => {
    if (d !== 'index.js' && d.endsWith('.js')) {
      Object.assign(module.exports, require(`./${d}`));
    }
  });
