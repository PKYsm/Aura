'use strict';
const fs = require('fs');
const path = require('path');
const config = require('../../config');

const LOG_DIR = path.join(process.cwd(), config.logging.dir);

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Appends a JSON line to logs/<category>.log (lowercased).
 * File writes are async + non-blocking; failures are swallowed
 * so a disk hiccup never crashes the bot's logging pipeline.
 */
function writeToFile(category, payload) {
  const filePath = path.join(LOG_DIR, `${category.toLowerCase()}.log`);
  const line = JSON.stringify(payload) + '\n';

  fs.appendFile(filePath, line, (err) => {
    if (err) {
      // last-resort console fallback — avoid infinite loops by not
      // routing this back through the logger itself
      // eslint-disable-next-line no-console
      console.error('[logger:file] failed to write log file:', err.message);
    }
  });
}

module.exports = { writeToFile };
