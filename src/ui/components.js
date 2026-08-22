"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMusicButtons = createMusicButtons;
const discord_js_1 = require("discord.js");
const emojis_1 = __importDefault(require("../utils/emojis"));
function createMusicButtons(guildId, isPlaying, loopMode, autoplay = false) {
    const row1 = [
        new discord_js_1.ButtonBuilder()
            .setCustomId(`AuraX:autoplay:${guildId}`)
            .setEmoji(emojis_1.default.music.autoplay)
            .setStyle(autoplay ? discord_js_1.ButtonStyle.Success : discord_js_1.ButtonStyle.Secondary),
        new discord_js_1.ButtonBuilder()
            .setCustomId(`AuraX:prev:${guildId}`)
            .setEmoji(emojis_1.default.music.prev)
            .setStyle(discord_js_1.ButtonStyle.Secondary),
        new discord_js_1.ButtonBuilder()
            .setCustomId(`AuraX:pause:${guildId}`)
            .setEmoji(isPlaying ? emojis_1.default.music.pause : emojis_1.default.music.play)
            .setStyle(discord_js_1.ButtonStyle.Success),
        new discord_js_1.ButtonBuilder()
            .setCustomId(`AuraX:skip:${guildId}`)
            .setEmoji(emojis_1.default.music.next)
            .setStyle(discord_js_1.ButtonStyle.Secondary),
        new discord_js_1.ButtonBuilder()
            .setCustomId(`AuraX:loop:${guildId}`)
            .setEmoji(emojis_1.default.music.loop)
            .setStyle(loopMode > 0 ? discord_js_1.ButtonStyle.Success : discord_js_1.ButtonStyle.Secondary),
    ];
    const row2 = [
        new discord_js_1.ButtonBuilder()
            .setCustomId(`AuraX:shuffle:${guildId}`)
            .setEmoji(emojis_1.default.music.shuffle)
            .setStyle(discord_js_1.ButtonStyle.Secondary),
        new discord_js_1.ButtonBuilder()
            .setCustomId(`AuraX:rewind:${guildId}`)
            .setEmoji(emojis_1.default.music.back)
            .setStyle(discord_js_1.ButtonStyle.Secondary),
        new discord_js_1.ButtonBuilder()
            .setCustomId(`AuraX:stop:${guildId}`)
            .setEmoji(emojis_1.default.music.stop)
            .setStyle(discord_js_1.ButtonStyle.Secondary),
        new discord_js_1.ButtonBuilder()
            .setCustomId(`AuraX:forward:${guildId}`)
            .setEmoji(emojis_1.default.music.forward)
            .setStyle(discord_js_1.ButtonStyle.Secondary),
        new discord_js_1.ButtonBuilder()
            .setCustomId(`AuraX:heart:${guildId}`)
            .setEmoji(emojis_1.default.music.like)
            .setStyle(discord_js_1.ButtonStyle.Secondary),
    ];
    return { row1, row2 };
}
