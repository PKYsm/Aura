'use strict';

/**
 * Determines whether "now" falls inside the 22:00–06:00 IST quiet window.
 * Uses Intl.DateTimeFormat with the Asia/Kolkata timezone so the result
 * is correct regardless of the host server's local timezone or clock.
 */
function isSilentWindowIST(date = new Date()) {
  const istHour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    }).format(date),
    10
  );

  // Window: 22:00 (inclusive) through 05:59 (i.e. anything before 06:00)
  return istHour >= 22 || istHour < 6;
}

module.exports = { isSilentWindowIST };
