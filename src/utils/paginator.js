"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaginator = createPaginator;
const discord_js_1 = require("discord.js");
const emojis_1 = __importDefault(require("./emojis"));
function createPaginator(items, page, pageSize, customIdPrefix, guildId, title) {
    const container = new discord_js_1.ContainerBuilder();
    const totalPages = Math.ceil(items.length / pageSize) || 1;
    const currentPage = Math.max(1, Math.min(page, totalPages));
    const start = (currentPage - 1) * pageSize;
    const currentItems = items.slice(start, start + pageSize);
    container.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`# ${emojis_1.default.general.stats} ${title}`), new discord_js_1.TextDisplayBuilder().setContent(currentItems.length > 0 ? currentItems.join('\n') : `> ${emojis_1.default.general.cross} No items to display.`));
    container.addSeparatorComponents(new discord_js_1.SeparatorBuilder().setSpacing(discord_js_1.SeparatorSpacingSize.Small));
    container.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`-# Page ${currentPage} / ${totalPages} • Aura - Made By Aura Devs`));
    const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
        .setCustomId(`${customIdPrefix}:prev:${guildId}:${currentPage - 1}`)
        .setLabel('Previous')
        .setStyle(discord_js_1.ButtonStyle.Secondary)
        .setDisabled(currentPage <= 1), new discord_js_1.ButtonBuilder()
        .setCustomId(`${customIdPrefix}:next:${guildId}:${currentPage + 1}`)
        .setLabel('Next')
        .setStyle(discord_js_1.ButtonStyle.Secondary)
        .setDisabled(currentPage >= totalPages));
    container.addActionRowComponents(row);
    return container;
}
