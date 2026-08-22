"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const emojis_1 = __importDefault(require("../../utils/emojis"));
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('stats')
        .setDescription('Show detailed bot statistics.'),
    category: 'general',
    aliases: ['statistics', 'botstats'],
    async prefixExecute(client, message, args) {
        await this.handleAction(client, message, true);
    },
    async execute(interaction, client) {
        await this.handleAction(client, interaction, false);
    },
    async handleAction(client, context, isPrefix) {
        const authorId = isPrefix ? context.author.id : context.user.id;
        const botName = client.user?.username || 'Bot';
        const c = (0, containers_1.container)(`${emojis_1.default.general.dot} Please select a category from the dropdown below to view statistics.`, {
            title: `${emojis_1.default.general.stats_icon} ${botName} Stats`,
            footer: `${botName} • v1.0.0`
        });
        const customPrefix = 'AuraX';
        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`${customPrefix}:stats_select:${authorId}`)
            .setPlaceholder('Select stats category...')
            .addOptions({ label: "General Stats", description: "Servers, Users, Shards", emoji: emojis_1.default.general.stats, value: "general" }, { label: "Team Info", description: "Owner and Developer info", emoji: emojis_1.default.general.team, value: "team" }, { label: "System Info", description: "DB, RAM, CPU", emoji: emojis_1.default.general.system, value: "system" }, { label: "Ping", description: "Database & Websocket Latency", emoji: emojis_1.default.general.ping, value: "ping" }, { label: "Music Node", description: "Lavalink Node status", emoji: emojis_1.default.general.music, value: "music" });
        const row = new discord_js_1.ActionRowBuilder().addComponents(select);
        c.addActionRowComponents(row);
        if (isPrefix) {
            await context.reply((0, containers_1.cv2)(c));
        }
        else {
            await context.reply((0, containers_1.cv2)(c));
        }
    }
};
