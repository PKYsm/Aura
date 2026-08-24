"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanTitle = cleanTitle;
exports.shortenTitle = shortenTitle;
exports.clickableTitle = clickableTitle;

const DEFAULT_MAX_LEN = 30;

/** Strips hashtags, @mentions, and Discord user pings out of a track title before it's ever shown. */
function cleanTitle(title) {
    if (!title)
        return '';
    return title
        .replace(/<@!?\d+>/g, '')
        .replace(/#\S+/g, '')
        .replace(/@\S+/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/** Cleaned title, truncated to maxLen characters (default 30) with an ellipsis if it had to be cut.
 *  Pass Infinity to get the full cleaned title with no truncation at all. */
function shortenTitle(title, maxLen = DEFAULT_MAX_LEN) {
    const clean = cleanTitle(title) || 'Unknown Track';
    return clean.length > maxLen ? `${clean.slice(0, maxLen - 1).trim()}…` : clean;
}

/** Title (optionally full-length via maxLen = Infinity) wrapped as a clickable markdown link when a
 *  track URI is available, plain text otherwise. */
function clickableTitle(title, uri, maxLen = DEFAULT_MAX_LEN) {
    const label = shortenTitle(title, maxLen);
    return uri ? `[${label}](${uri})` : label;
}
