"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterManager = void 0;
class FilterManager {
    player;
    activeFilters = new Set();
    constructor(player) {
        this.player = player;
    }
    applyPreset(preset) {
        if (preset === 'clear') {
            this.clearFilters();
            return;
        }
        this.activeFilters.add(preset);
        const filters = {};
        if (this.activeFilters.has('bass')) {
            filters.equalizer = [
                { band: 0, gain: 0.5 },
                { band: 1, gain: 0.4 },
                { band: 2, gain: 0.3 },
                { band: 3, gain: 0.2 },
            ];
        }
        if (this.activeFilters.has('treble')) {
            filters.equalizer = filters.equalizer || [];
            filters.equalizer.push({ band: 8, gain: 0.3 }, { band: 9, gain: 0.4 }, { band: 10, gain: 0.5 }, { band: 11, gain: 0.5 }, { band: 12, gain: 0.5 }, { band: 13, gain: 0.5 });
        }
        if (this.activeFilters.has('nightcore')) {
            filters.timescale = { speed: 1.2, pitch: 1.2, rate: 1.0 };
        }
        if (this.activeFilters.has('vaporwave')) {
            filters.timescale = { speed: 0.8, pitch: 0.8, rate: 1.0 };
        }
        if (this.activeFilters.has('8d')) {
            filters.rotation = { rotationHz: 0.2 };
        }
        if (this.activeFilters.has('karaoke')) {
            filters.karaoke = { level: 1, monoLevel: 1, filterBand: 220, filterWidth: 100 };
        }
        if (this.activeFilters.has('soft')) {
            filters.lowPass = { smoothing: 20 };
        }
        if (this.activeFilters.has('tremolo')) {
            filters.tremolo = { frequency: 2, depth: 0.5 };
        }
        if (this.activeFilters.has('vibrato')) {
            filters.vibrato = { frequency: 2, depth: 0.5 };
        }
        if (this.activeFilters.has('distortion')) {
            filters.distortion = { sinOffset: 0, sinScale: 1, cosOffset: 0, cosScale: 1, tanOffset: 0, tanScale: 0, offset: 0, scale: 1 };
        }
        this.player.shoukaku.setFilters(filters);
    }
    setTimescale(speed, pitch) {
        this.player.shoukaku.setFilters({ timescale: { speed, pitch, rate: 1.0 } });
    }
    clearFilters() {
        this.activeFilters.clear();
        this.player.shoukaku.setFilters({});
    }
}
exports.FilterManager = FilterManager;
