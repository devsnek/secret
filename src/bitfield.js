'use strict';

class Bitfield {
  constructor(v) {
    this.value = 0;
    if (v) {
      for (const b of v) {
        this.add(b);
      }
    }
  }

  getBit(b) {
    if (typeof b === 'number') {
      return b;
    }
    return 1 << this.constructor.FIELDS.indexOf(b);
  }

  add(bit) {
    this.value |= this.getBit(bit);
  }

  remove(bit) {
    this.value &= ~this.getBit(bit);
  }

  has(b) {
    const bit = this.getBit(b);
    return (this.value & bit) === bit;
  }
}

module.exports = { Bitfield };
