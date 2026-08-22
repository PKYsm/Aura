"use strict";
/**
 * Root startup file for Aura.
 * Run with: node index.js  (or `npm start`)
 *
 * The real bootstrap logic (sharding manager, ASCII banner, etc.) lives in
 * src/index.js — this file just kicks it off so the process entry point
 * sits at the project root instead of inside src/.
 */
require("./src/index.js");
