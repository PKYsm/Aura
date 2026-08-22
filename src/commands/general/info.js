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
        .setName('info')
        .setDescription('View information about the Aura bot.'),
    category: 'general',
    aliases: ['info'],
    async prefixExecute(client, message, args) {
        await this.handleAction(client, message);
    },
    async execute(interaction, client) {
        await this.handleAction(client, interaction);
    },
    async handleAction(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const servers = client.guilds.cache.size;
        const users = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
        let prefix = '$';
        if (context.guildId) {
            const gConf = await client.db.guildConfig.findUnique({ where: { guildId: context.guildId } });
            if (gConf && gConf.prefix)
                prefix = gConf.prefix;
        }
        const c = new discord_js_1.ContainerBuilder();
        c.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`# ${emojis_1.default.general.music} Aura\n### *A Premium Experience Made By Aura Devs*\n\n> ${emojis_1.default.general.settings} **Bot Settings**\n> ${emojis_1.default.general.dot} **Prefix:** \`${prefix}\`\n> ${emojis_1.default.general.dot} **Command Mode:** \`Hybrid (Slash & Prefix)\`\n\n> ${emojis_1.default.general.stats_icon} **Bot Statistics**\n> ${emojis_1.default.general.dot} **Servers:** ${servers}\n> ${emojis_1.default.general.dot} **Users:** ${users.toLocaleString()}\n\n-# Developed by ${botInfo_1.default.developer.name} • Use \`${prefix}help\` or type \`/\` to explore commands!`));
        c.addSeparatorComponents(new discord_js_1.SeparatorBuilder());
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setLabel("Support Server").setURL("https://discord.gg/Vx43JXddFD").setStyle(discord_js_1.ButtonStyle.Link), new discord_js_1.ButtonBuilder().setLabel("Invite Aura").setURL(`https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`).setStyle(discord_js_1.ButtonStyle.Link));
        c.addActionRowComponents(row);
        await reply((0, containers_1.cv2)(c));
    }
};
