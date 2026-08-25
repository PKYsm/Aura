'use strict';
const chalk = require('chalk');

/**
 * Maps log categories to a distinct chalk color so the console
 * output is scannable at a glance.
 */
const CATEGORY_COLORS = {
  COMMAND: chalk.hex('#FF1493').bold, // Aura pink for command events
  COMPONENT: chalk.cyanBright.bold,
  AUDIO: chalk.greenBright.bold,
  DATABASE: chalk.yellowBright.bold,
  SYSTEM: chalk.magentaBright.bold,
  ERROR: chalk.redBright.bold,
  WARN: chalk.yellow.bold,
};

const LEVEL_BADGES = {
  info: chalk.bgBlue.black(' INFO '),
  warn: chalk.bgYellow.black(' WARN '),
  error: chalk.bgRed.white(' ERROR '),
  success: chalk.bgGreen.black(' OK '),
  debug: chalk.bgGray.white(' DEBUG '),
};

function timestamp() {
  return chalk.gray(`[${new Date().toISOString()}]`);
}

function printToConsole(category, level, message, meta = {}) {
  const color = CATEGORY_COLORS[category] || chalk.white.bold;
  const badge = LEVEL_BADGES[level] || LEVEL_BADGES.info;
  const tag = color(`[${category}]`);
  const metaStr = Object.keys(meta).length
    ? chalk.dim(
        Object.entries(meta)
          .map(([k, v]) => `${k}=${v}`)
          .join(' ')
      )
    : '';

  console.log(`${timestamp()} ${badge} ${tag} ${message} ${metaStr}`.trim());
}

module.exports = { printToConsole };
