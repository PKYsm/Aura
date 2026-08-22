"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('bprefix')
        .setDescription('Changes the bot\'s prefix for this server.')
        .addStringOption(o => o.setName('prefix').setDescription('New prefix').setRequired(true))
        .setDefaultMemberPermissions(discord_js_1.PermissionsBitField.Flags.Administrator),
    category: 'premium',
    aliases: ['bprefix'],
    async prefixExecute(client, message, args) {
        if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator) && message.author.id !== message.guild?.ownerId) {
            return message.reply((0, containers_1.cv2)((0, containers_1.container)('You must be a Server Administrator or Owner to use this.', { title: 'Missing Permissions', color: 'error' })));
        }
        const prefix = args[0];
        await this.handleAction(client, message, prefix);
    },
    async execute(interaction, client) {
        const prefix = interaction.options.getString('prefix', true);
        await this.handleAction(client, interaction, prefix);
    },
    async handleAction(client, context, newPrefix) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        const isPremium = await client.db.premiumUser.findUnique({ where: { userId: authorId } });
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!isPremium && !ownerIds.includes(authorId)) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('This command is exclusively for Premium Users.', { title: 'Aura Premium', color: 'error' })));
        }
        if (!newPrefix) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('Please provide a new prefix.', { title: 'Aura Customization', color: 'error' })));
        }
        if (newPrefix.length > 5) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('Prefix must be 5 characters or less.', { title: 'Aura Customization', color: 'error' })));
        }
        try {
            await client.db.guildConfig.upsert({
                where: { guildId: context.guildId },
                update: { prefix: newPrefix },
                create: { guildId: context.guildId, prefix: newPrefix }
            });
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully changed the bot's prefix to \`${newPrefix}\` for this server!`, { title: 'Aura Customization', color: 'success' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Failed to update prefix: \`${e.message || e}\``, { title: 'Aura Customization', color: 'error' })));
        }
    }
};
