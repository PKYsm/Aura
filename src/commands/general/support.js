"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const emojis_1 = __importDefault(require("../../utils/emojis"));
const botInfo_1 = __importDefault(require("../../config/botInfo"));
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('support')
        .setDescription('Get the link to our official support server.'),
    category: 'general',
    aliases: ['support-server', 'server'],
    async prefixExecute(client, message, args) {
        await this.handleAction(client, message, true);
    },
    async execute(interaction, client) {
        await this.handleAction(client, interaction, false);
    },
    async handleAction(client, context, isPrefix) {
        const c = (0, containers_1.container)(`Need help or have questions? Join our support server!`, {
            title: `${emojis_1.default.general.team} Support Server`,
        });
        const supportLink = botInfo_1.default.links.supportServer;
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setLabel('Join Support Server')
            .setURL(supportLink)
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
