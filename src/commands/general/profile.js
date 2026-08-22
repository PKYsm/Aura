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
        .setName('profile')
        .setDescription("View your or another user's profile.")
        .addUserOption(o => o.setName('user').setDescription('The user').setRequired(false)),
    category: 'general',
    aliases: ['profile'],
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
        const createdAt = `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`;
        let npStatus = 'Not Granted';
        let npAccess = 'Not Granted';
        try {
            const npData = await client.db.noPrefixUser.findUnique({ where: { userId: targetUser.id } });
            if (npData) {
                if (npData.expiresAt && npData.expiresAt.getTime() > Date.now()) {
                    npStatus = `Active (Expires <t:${Math.floor(npData.expiresAt.getTime() / 1000)}:R>)`;
                    npAccess = 'Granted';
                }
                else if (!npData.expiresAt) {
                    npStatus = 'Active (Lifetime)';
                    npAccess = 'Granted';
                }
            }
        }
        catch { }
        const badges = [`${emojis_1.default.badges.member} Member`];
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (ownerIds.includes(targetUser.id))
            badges.push(`${emojis_1.default.badges.owner} Owner`);
        try {
            const isAdmin = await client.db.adminUser.findUnique({ where: { userId: targetUser.id } });
            if (isAdmin)
                badges.push(`${emojis_1.default.badges.admin} Admin`);
            const isPremium = await client.db.premiumUser.findUnique({ where: { userId: targetUser.id } });
            if (isPremium)
                badges.push(`${emojis_1.default.badges.premium} Premium`);
        }
        catch { }
        const containers = [];
        const c1 = new discord_js_1.ContainerBuilder();
        const s1 = new discord_js_1.SectionBuilder()
            .setThumbnailAccessory(new discord_js_1.ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ size: 4096 })))
            .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`# ${emojis_1.default.general.stats} User Profile\n### *Aura - Made By Aura Devs*\n\n> ${emojis_1.default.general.dot} **User:** <@${targetUser.id}>\n> ${emojis_1.default.general.dot} **ID:** \`${targetUser.id}\`\n> ${emojis_1.default.general.dot} **Created:** ${createdAt}\n\n> ${emojis_1.default.general.customization} **NoPrefix Status**\n> ${emojis_1.default.general.dot} **Access:** \`${npAccess}\`\n> ${emojis_1.default.general.dot} **Status:** \`${npStatus}\``));
        c1.addSectionComponents(s1);
        containers.push(c1);
        const c2 = new discord_js_1.ContainerBuilder();
        const bullets = badges.map(b => `> ${b}`).join('\n');
        c2.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`## ${emojis_1.default.general.premium} Badges Achieved\n${bullets}`));
        containers.push(c2);
        await reply((0, containers_1.cv2)(containers));
    }
};
