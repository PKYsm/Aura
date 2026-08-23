"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDuration = formatDuration;
exports.createProgressBar = createProgressBar;
exports.formatTime = formatTime;
exports.progressBar = progressBar;
function formatDuration(ms) {
    if (ms === 0)
        return '00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n) => n.toString().padStart(2, '0');
    if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
}
function createProgressBar(current, total, size = 15) {
    if (total === 0)
        return '░'.repeat(size);
    const progress = Math.min(Math.max(current / total, 0), 1);
    const filledBars = Math.round(progress * size);
    const emptyBars = size - filledBars;
    return '█'.repeat(filledBars) + '░'.repeat(emptyBars);
}
/** Short m:ss form (no leading zero on minutes) — used by the lyrics sync bar and nowplaying. */
function formatTime(ms) {
    const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}
/** The ━/〇/┄ style progress bar shared by the lyrics sync view and nowplaying. */
function progressBar(position, duration, size = 15) {
    if (!duration)
        return '';
    const ratio = Math.min(Math.max(position / duration, 0), 1);
    const knobPos = Math.min(size - 1, Math.round(ratio * (size - 1)));
    let bar = '';
    for (let i = 0; i < size; i++) {
        if (i < knobPos)
            bar += '━';
        else if (i === knobPos)
            bar += '〇';
        else
            bar += '┄';
    }
    return bar;
}
