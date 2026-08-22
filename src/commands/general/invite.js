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
        .setName('invite')
        .setDescription('Get the invite link for the bot.'),
    category: 'general',
    aliases: ['inv', 'invitelink'],
    async prefixExecute(client, message, args) {
        await this.handleAction(client, message, true);
    },
    async execute(interaction, client) {
        await this.handleAction(client, interaction, false);
    },
    async handleAction(client, context, isPrefix) {
        const botName = client.user?.username || 'Bot';
        const c = (0, containers_1.container)(`Click the button below to invite **${botName}** to your server!`, {
            title: `${emojis_1.default.general.dot} Invite ${botName}`,
        });
        // In a real scenario, client.generateInvite could be used, but hardcoded or derived is fine.
        const inviteLink = `https://discord.com/api/oauth2/authorize?client_id=${client.user?.id}&permissions=8&scope=bot%20applications.commands`;
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setLabel('Invite Me')
            .setURL(inviteLink)
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
