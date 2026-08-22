"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const emojis_1 = __importDefault(require("../../utils/emojis"));
const bnameplate_1 = require("../premium/bnameplate");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('engine')
        .setDescription('Set your default search engine for music (Spotify, YouTube, SoundCloud, etc)'),
    category: 'music',
    async execute(interaction, client) {
        await this.handleAction(client, interaction);
    },
    async prefixExecute(client, message, args) {
        await this.handleAction(client, message);
    },
    async handleAction(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const userId = isInteraction ? context.user.id : context.author.id;
        const userConfig = await client.db.userConfig.findUnique({ where: { userId } });
        const currentEngine = userConfig?.searchEngine || 'spsearch';
        const engines = {
            'ytsearch': { name: 'YouTube', emoji: '<:emoji_39:1454496634770817054>' },
            'spsearch': { name: 'Spotify', emoji: '<:emoji_36:1454496625438228613>' },
            'scsearch': { name: 'SoundCloud', emoji: '<:soundcloud:1513805493192360077>' },
            'dzsearch': { name: 'Deezer', emoji: '<:Deezer:1515666887302840330>' },
            'jssearch': { name: 'JioSaavn', emoji: '<:jiosaavn:1513805340691529728>' }
        };
        const currentName = engines[currentEngine]?.name || currentEngine;
        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`${(0, bnameplate_1.getCustomIdPrefix)(client)}:engine_select:${userId}`)
            .setPlaceholder(`Current: ${currentName}`);
        Object.entries(engines).forEach(([value, info]) => {
            select.addOptions({
                label: info.name,
                value: value,
                description: `Set ${info.name} as default search engine`,
                emoji: info.emoji
            });
        });
        const row = new discord_js_1.ActionRowBuilder().addComponents(select);
        const c = (0, containers_1.container)(`**Select your preferred music search engine!**\nWhenever you type a song name, we'll search on this platform.\n\n${emojis_1.default.general.dot} **Current Engine:** \`${currentName}\``, { title: 'Music Engine' });
        c.addActionRowComponents(row);
        await reply((0, containers_1.cv2)(c));
    }
};
