"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPlayerUI = buildPlayerUI;
const discord_js_1 = require("discord.js");
const components_1 = require("./components");
const containers_1 = require("./containers");
const emojis_1 = __importDefault(require("../utils/emojis"));
function getSourceEmoji(sourceName) {
    const map = {
        youtube: emojis_1.default.music.youtube,
        soundcloud: emojis_1.default.music.soundcloud,
        spotify: emojis_1.default.music.spotify,
        jiosaavn: emojis_1.default.music.jiosaavn,
        deezer: emojis_1.default.music.deezer,
    };
    return map[sourceName?.toLowerCase()] || emojis_1.default.music.youtube;
}
function getSourceLink(track) {
    const source = track.sourceName?.toLowerCase() || '';
    const emoji = getSourceEmoji(source);
    if (source === 'spotify')
        return `${emoji} [Listen on Spotify](${track.uri})`;
    if (source === 'jiosaavn')
        return `${emoji} [Listen on JioSaavn](${track.uri})`;
    if (source === 'soundcloud')
        return `${emoji} [Listen on SoundCloud](${track.uri})`;
    if (source === 'deezer')
        return `${emoji} [Listen on Deezer](${track.uri})`;
    return `${emoji} [Listen on YouTube](${track.uri})`;
}
function buildPlayerUI(guildId, track, position, isPlaying, loopMode, queueSize, volume, autoplay, requesterName) {
    const container = new discord_js_1.ContainerBuilder();
    container.setAccentColor(containers_1.THEME_COLOR);
    const sec = (track.length || 0) / 1000;
    const duration = `${Math.floor(sec / 60).toString().padStart(2, '0')}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;
    let reqName = 'Autoplay';
    if (requesterName)
        reqName = requesterName;
    else if (track.requester) {
        const rId = track.requester.id || track.requester;
        const isBot = track.requester.bot === true;
        if (!isBot && rId !== 'autoplay') {
            reqName = `<@${rId}>`;
        }
    }
    const mainTrackInfo = `# ${emojis_1.default.music.playing} Now Playing\n### **${track.title}**`;
    const extraInfo = `> ${emojis_1.default.general.dot} **Author:** \`${track.author || 'Aura GGs'}\`\n> ${emojis_1.default.general.dot} **Duration:** \`${duration}\`\n> ${emojis_1.default.general.dot} **Source:** ${getSourceLink(track)}\n\n${emojis_1.default.general.team} **Requested by:** ${reqName}\n\n-# Aura - Made By Aura Devs`;
    const section = new discord_js_1.SectionBuilder()
        .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(mainTrackInfo));
    if (track.thumbnail) {
        section.setThumbnailAccessory(new discord_js_1.ThumbnailBuilder().setURL(track.thumbnail));
    }
    else {
        section.setThumbnailAccessory(new discord_js_1.ThumbnailBuilder().setURL('https://cdn.discordapp.com/embed/avatars/0.png'));
    }
    container.addSectionComponents(section);
    container.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(extraInfo));
    container.addSeparatorComponents(new discord_js_1.SeparatorBuilder().setSpacing(discord_js_1.SeparatorSpacingSize.Small));
    const { row1, row2 } = (0, components_1.createMusicButtons)(guildId, isPlaying, loopMode, autoplay);
    container.addActionRowComponents(new discord_js_1.ActionRowBuilder().addComponents(...row1), new discord_js_1.ActionRowBuilder().addComponents(...row2));
    return container;
}
