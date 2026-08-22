"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSpotifyTrack = resolveSpotifyTrack;
exports.resolveSpotifyPlaylist = resolveSpotifyPlaylist;
const web_api_ts_sdk_1 = require("@spotify/web-api-ts-sdk");
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
let spotify = null;
if (SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET) {
    try {
        spotify = web_api_ts_sdk_1.SpotifyApi.withClientCredentials(SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET);
    }
    catch (err) {
        console.error('[SPOTIFY] Failed to initialize client');
    }
}
async function resolveSpotifyTrack(url) {
    if (!spotify)
        return null;
    try {
        const match = url.match(/track\/([a-zA-Z0-9]+)/);
        if (!match)
            return null;
        const track = await spotify.tracks.get(match[1]);
        return `${track.name} ${track.artists.map((a) => a.name).join(' ')}`;
    }
    catch (e) {
        return null;
    }
}
async function resolveSpotifyPlaylist(url) {
    if (!spotify)
        return null;
    try {
        const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
        if (!match)
            return null;
        const playlist = await spotify.playlists.getPlaylistItems(match[1]);
        return playlist.items.map((i) => `${i.track.name} ${i.track.artists.map((a) => a.name).join(' ')}`);
    }
    catch (e) {
        return null;
    }
}
