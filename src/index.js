'use strict';

[
  './client',
  './structures',
].forEach((r) => {
  Object.assign(module.exports, require(r));
});
