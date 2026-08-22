"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('bbio')
        .setDescription('Changes the bot\'s bio in this server.')
        .addStringOption(o => o.setName('text').setDescription('Bio text').setRequired(true))
        .setDefaultMemberPermissions(discord_js_1.PermissionsBitField.Flags.Administrator),
    category: 'premium',
    aliases: ['bbio'],
    async prefixExecute(client, message, args) {
        if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator) && message.author.id !== message.guild?.ownerId) {
            return message.reply((0, containers_1.cv2)((0, containers_1.container)('You must be a Server Administrator or Owner to use this.', { title: 'Missing Permissions', color: 'error' })));
        }
        const bio = args.join(' ');
        await this.handleAction(client, message, bio || undefined);
    },
    async execute(interaction, client) {
        const bio = interaction.options.getString('text', true);
        await this.handleAction(client, interaction, bio);
    },
    async handleAction(client, context, bio) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        const isPremium = await client.db.premiumUser.findUnique({ where: { userId: authorId } });
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!isPremium && !ownerIds.includes(authorId)) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('This command is exclusively for Premium Users.', { title: 'Aura Premium', color: 'error' })));
        }
        if (!bio) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('Please provide a bio text or use `none` to reset.', { title: 'Aura Customization', color: 'error' })));
        }
        const newBio = bio.toLowerCase() === 'none' ? null : bio;
        try {
            await client.db.guildConfig.upsert({
                where: { guildId: context.guildId },
                update: { bio: newBio },
                create: { guildId: context.guildId, bio: newBio }
            });
            const status = newBio === null ? 'reset' : 'updated';
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully ${status} the bot's server-specific bio!`, { title: 'Aura Customization', color: 'success' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Failed to update bio: \`${e.message || e}\``, { title: 'Aura Customization', color: 'error' })));
        }
    }
};
