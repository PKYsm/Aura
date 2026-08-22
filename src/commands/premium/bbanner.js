"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('bbanner')
        .setDescription('Changes the bot\'s banner in this server.')
        .addStringOption(o => o.setName('url').setDescription('Image URL').setRequired(false))
        .addAttachmentOption(o => o.setName('image').setDescription('Image file').setRequired(false))
        .setDefaultMemberPermissions(discord_js_1.PermissionsBitField.Flags.Administrator),
    category: 'premium',
    aliases: ['bbanner'],
    async prefixExecute(client, message, args) {
        if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator) && message.author.id !== message.guild?.ownerId) {
            return message.reply((0, containers_1.cv2)((0, containers_1.container)('You must be a Server Administrator or Owner to use this.', { title: 'Missing Permissions', color: 'error' })));
        }
        const url = args[0] || message.attachments.first()?.url;
        await this.handleAction(client, message, url);
    },
    async execute(interaction, client) {
        const url = interaction.options.getString('url') || interaction.options.getAttachment('image')?.url;
        await this.handleAction(client, interaction, url || undefined);
    },
    async handleAction(client, context, url) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        const isPremium = await client.db.premiumUser.findUnique({ where: { userId: authorId } });
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!isPremium && !ownerIds.includes(authorId)) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('This command is exclusively for Premium Users.', { title: 'Aura Premium', color: 'error' })));
        }
        if (!url) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('Please provide a URL or attach an image.', { title: 'Aura Customization', color: 'error' })));
        }
        const targetUrl = url.toLowerCase() === 'none' ? null : url;
        try {
            if (targetUrl) {
                const res = await fetch(targetUrl).catch(() => null);
                if (!res || !res.ok) {
                    return reply((0, containers_1.cv2)((0, containers_1.container)('Failed to download image. Please check the URL.', { title: 'Aura Customization', color: 'error' })));
                }
            }
            await client.db.guildConfig.upsert({
                where: { guildId: context.guildId },
                update: { bannerUrl: targetUrl },
                create: { guildId: context.guildId, bannerUrl: targetUrl }
            });
            const status = targetUrl === null ? 'reset' : 'updated';
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully ${status} the bot's server-specific banner!`, { title: 'Aura Customization', color: 'success' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Failed to update banner: \`${e.message || e}\``, { title: 'Aura Customization', color: 'error' })));
        }
    }
};
