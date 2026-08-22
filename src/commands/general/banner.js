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
        .setName('banner')
        .setDescription("View your or another user's banner.")
        .addUserOption(o => o.setName('user').setDescription('The user').setRequired(false)),
    category: 'general',
    aliases: ['banner'],
    async prefixExecute(client, message, args) {
        let user = message.mentions.users.first();
        if (!user && args.length > 0) {
            user = await client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null);
        }
        if (!user)
            user = message.author;
        await this.handleAction(client, message, user);
    },
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        await this.handleAction(client, interaction, targetUser);
    },
    async handleAction(client, context, targetUser) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const fullUser = await targetUser.fetch();
        if (!fullUser.banner) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('This user does not have a banner.', { title: 'Aura Info', color: 'error' })));
        }
        const bannerUrl = fullUser.bannerURL({ size: 4096, extension: 'png' });
        const c1 = new discord_js_1.ContainerBuilder();
        const s1 = new discord_js_1.SectionBuilder()
            .setThumbnailAccessory(new discord_js_1.ThumbnailBuilder().setURL(bannerUrl))
            .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`# ${emojis_1.default.general.customization} ${targetUser.displayName}'s Banner\n\n> ${emojis_1.default.general.dot} **[Click here to download](${bannerUrl})**\n\n-# Aura - Made By Aura Devs`));
        c1.addSectionComponents(s1);
        await reply((0, containers_1.cv2)(c1));
    }
};
