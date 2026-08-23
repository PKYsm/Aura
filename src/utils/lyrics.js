"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchLyrics = fetchLyrics;
exports.parseSyncedLyrics = parseSyncedLyrics;
exports.getCurrentLineIndex = getCurrentLineIndex;
const genius_lyrics_1 = __importDefault(require("genius-lyrics"));

const GENIUS_TOKEN = process.env.GENIUS_TOKEN || '';
const geniusClient = GENIUS_TOKEN ? new genius_lyrics_1.default.Client(GENIUS_TOKEN) : null;

/** Strips noise like "(Official Video)", "[Lyrics]", "ft. X" etc. for cleaner search matches. */
function cleanTitle(title) {
    return title
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?(official|video|audio|lyrics|remix|visualizer).*?\)/gi, '')
        .replace(/official( music)?( video| audio)?/gi, '')
        .replace(/lyrics? video/gi, '')
        .trim();
}

/** Parses standard .lrc synced lyrics ("[mm:ss.xx] text") into a sorted [{ time, text }] array (time in ms). */
function parseSyncedLyrics(lrc) {
    if (!lrc) return [];
    const regex = /^\[(\d{2}):(\d{2})(?:[.:](\d{2,3}))?\]\s*(.*)$/;
    const lines = [];
    for (const raw of lrc.split('\n')) {
        const match = raw.trim().match(regex);
        if (!match) continue;
        const [, min, sec, frac, text] = match;
        const ms = frac ? parseInt(frac.padEnd(3, '0'), 10) : 0;
        const time = parseInt(min, 10) * 60000 + parseInt(sec, 10) * 1000 + ms;
        if (text.trim()) lines.push({ time, text: text.trim() });
    }
    return lines.sort((a, b) => a.time - b.time);
}

/** Given synced lines and a playback position (ms), returns the index of the currently active line. */
function getCurrentLineIndex(lines, positionMs) {
    if (!lines.length) return -1;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].time <= positionMs) idx = i;
        else break;
    }
    return idx;
}

/** Rough native-script ratio (Devanagari + Gurmukhi) vs total lettering — used to prefer native-script
 *  lyrics over romanized/Latin transliterations when a search returns multiple candidates. */
function nativeScriptRatio(text) {
    if (!text) return 0;
    const letters = text.match(/[a-zA-Z\u0900-\u097F\u0A00-\u0A7F]/g) || [];
    if (!letters.length) return 0;
    const native = letters.filter(ch => /[\u0900-\u097F\u0A00-\u0A7F]/.test(ch)).length;
    return native / letters.length;
}

/** LRCLIB's /search endpoint has no popularity/view/like metric to rank by — it only returns raw
 *  submissions. This scores candidates on what IS available: synced-lyrics presence (more complete
 *  submissions tend to have them) and native-script ratio (prefers Devanagari/Gurmukhi text over a
 *  romanized transliteration of the same song). */
function scoreLrclibCandidate(entry) {
    const text = entry.syncedLyrics || entry.plainLyrics || '';
    let score = 0;
    if (entry.syncedLyrics) score += 2;
    score += nativeScriptRatio(text) * 3;
    return score;
}

/** Source 1: LRCLIB (lrclib.net) — free, no API key, provides both synced (.lrc) and plain lyrics. */
async function fetchFromLrclib(title, artist, durationSec) {
    try {
        const params = new URLSearchParams({ track_name: title, artist_name: artist || '' });
        if (durationSec) params.set('duration', String(Math.round(durationSec)));
        const getRes = await fetch(`https://lrclib.net/api/get?${params.toString()}`, {
            headers: { 'User-Agent': 'Aura Discord Bot (https://github.com/PKYsm)' }
        });
        if (getRes.ok) {
            const data = await getRes.json();
            if (data && (data.syncedLyrics || data.plainLyrics)) {
                return {
                    source: 'LRCLIB',
                    synced: data.syncedLyrics ? parseSyncedLyrics(data.syncedLyrics) : [],
                    plain: data.plainLyrics || null,
                };
            }
        }
        const searchParams = new URLSearchParams({ track_name: title, artist_name: artist || '' });
        const searchRes = await fetch(`https://lrclib.net/api/search?${searchParams.toString()}`, {
            headers: { 'User-Agent': 'Aura Discord Bot (https://github.com/PKYsm)' }
        });
        if (searchRes.ok) {
            const results = await searchRes.json();
            const usable = Array.isArray(results) ? results.filter(r => r.syncedLyrics || r.plainLyrics) : [];
            if (usable.length > 0) {
                const best = usable.slice().sort((a, b) => scoreLrclibCandidate(b) - scoreLrclibCandidate(a))[0];
                return {
                    source: 'LRCLIB',
                    synced: best.syncedLyrics ? parseSyncedLyrics(best.syncedLyrics) : [],
                    plain: best.plainLyrics || null,
                };
            }
        }
    } catch (err) {
        // network/parse failure — fall through to the next source
    }
    return null;
}

/** Source 2: lyrics.ovh — free, no API key, plain lyrics only. */
async function fetchFromLyricsOvh(title, artist) {
    if (!artist) return null;
    try {
        const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data && data.lyrics) {
            return { source: 'lyrics.ovh', synced: [], plain: data.lyrics.trim() };
        }
    } catch (err) {
        // fall through
    }
    return null;
}

/** Source 3: Genius (genius-lyrics) — needs GENIUS_TOKEN, plain lyrics only. */
async function fetchFromGenius(title, artist) {
    if (!geniusClient) return null;
    try {
        const searches = await geniusClient.songs.search(`${title} ${artist || ''}`.trim());
        if (!searches.length) return null;
        const lyrics = await searches[0].lyrics();
        if (lyrics) return { source: 'Genius', synced: [], plain: lyrics.trim() };
    } catch (err) {
        // fall through
    }
    return null;
}

/**
 * Fetches lyrics for a track, preferring synced (line-by-line timed) lyrics.
 * Tries LRCLIB first (synced + plain, no key), then lyrics.ovh (plain, no key),
 * then Genius (plain, needs GENIUS_TOKEN) as a last resort.
 * Returns { source, synced: [{time,text}], plain: string|null } or null if nothing found.
 */
async function fetchLyrics(title, artist, durationMs) {
    const query = cleanTitle(title);
    const durationSec = durationMs ? durationMs / 1000 : undefined;

    const fromLrclib = await fetchFromLrclib(query, artist, durationSec);
    if (fromLrclib && (fromLrclib.synced.length || fromLrclib.plain)) return fromLrclib;

    const fromOvh = await fetchFromLyricsOvh(query, artist);
    if (fromOvh) return fromOvh;

    const fromGenius = await fetchFromGenius(query, artist);
    if (fromGenius) return fromGenius;

    return null;
}
