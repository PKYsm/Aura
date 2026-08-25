'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../../config');

/**
 * Layer 3 — persistent local storage (db.json).
 * The final source of truth: everything written here survives
 * both process restarts and Redis outages.
 */
class JsonStore {
  constructor() {
    this.filePath = path.join(process.cwd(), config.database.jsonPath);
    const dir = path.dirname(this.filePath);

    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(this.filePath)) fs.writeFileSync(this.filePath, '{}');
  }

  _read() {
    try {
      return JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
    } catch {
      return {};
    }
  }

  _write(data) {
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  get(key) {
    return this._read()[key];
  }

  set(key, value) {
    const data = this._read();
    data[key] = value;
    this._write(data);
    return value;
  }

  delete(key) {
    const data = this._read();
    delete data[key];
    this._write(data);
  }
}

module.exports = JsonStore;
