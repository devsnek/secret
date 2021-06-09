'use strict';

class Store {
  constructor() {
    this.data = new Map();
  }

  get(key) {
    return this.data.get(key);
  }

  set(key, value) {
    return this.data.set(key, value);
  }

  has(key) {
    return this.data.has(key);
  }

  delete(key) {
    return this.data.delete(key);
  }

  update(items) {
    for (const v of items.values()) {
      this.set(v.id, v);
    }
  }

  [Symbol.iterator]() {
    return this.data.entries();
  }

  entries() {
    return this[Symbol.iterator]();
  }

  * keys() {
    for (const [k] of this) {
      yield k;
    }
  }

  * values() {
    for (const [, v] of this) {
      yield v;
    }
  }
}

class WeakStore extends Store {
  get(key) {
    const w = this.data.get(key);
    if (w === undefined) {
      return undefined;
    }
    const v = w.deref();
    if (v === undefined) {
      this.data.delete(key);
    }
    return v;
  }

  set(key, value) {
    const w = new WeakRef(value);
    return this.data.set(key, w);
  }

  has(key) {
    const w = this.data.get(key);
    if (w === undefined) {
      return false;
    }
    if (w.deref() === undefined) {
      this.data.delete(key);
      return false;
    }
    return true;
  }

  delete(key) {
    return this.data.delete(key);
  }

  * [Symbol.iterator]() {
    for (const [k, w] of this.data) {
      const v = w.deref();
      if (v === undefined) {
        this.data.delete(k);
      } else {
        yield [k, v];
      }
    }
  }
}

module.exports = { Store, WeakStore };
