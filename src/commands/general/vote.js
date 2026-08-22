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
        .setName('vote')
        .setDescription('Vote for the bot to support us!'),
    category: 'general',
    aliases: ['voted'],
    async prefixExecute(client, message, args) {
        await this.handleAction(client, message, true);
    },
    async execute(interaction, client) {
        await this.handleAction(client, interaction, false);
    },
    async handleAction(client, context, isPrefix) {
        const botName = client.user?.username || 'Bot';
        const c = (0, containers_1.container)(`Voting helps us grow and keeps the bot free! Click the button below to vote for **${botName}**.`, {
            title: `${emojis_1.default.general.premium} Vote for ${botName}`,
        });
        const voteLink = `https://top.gg/bot/${client.user?.id}/vote`; // top.gg vote link
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setLabel('Vote on Top.gg')
            .setURL(voteLink)
            .setStyle(discord_js_1.ButtonStyle.Link));
        c.addActionRowComponents(row);
        if (isPrefix) {
            await context.reply((0, containers_1.cv2)(c));
        }
        else {
            await context.reply((0, containers_1.cv2)(c));
        }
    }
};
