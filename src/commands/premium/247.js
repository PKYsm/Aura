"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('247')
        .setDescription('Manage 24/7 Voice Channel mode (Premium Only).')
        .addSubcommand(s => s.setName('activate').setDescription('Activate 24/7 mode in your current voice channel'))
        .addSubcommand(s => s.setName('deactivate').setDescription('Deactivate 24/7 mode for this server'))
        .addSubcommand(s => s.setName('list').setDescription('List all active 24/7 channels (Bot Admin Only)'))
        .addSubcommand(s => s.setName('remove').setDescription('Remove a 24/7 channel globally (Bot Admin Only)').addStringOption(o => o.setName('channel_id').setDescription('Channel ID').setRequired(true))),
    category: 'premium',
    aliases: ['247', '24/7'],
    async prefixExecute(client, message, args) {
        const sub = args[0]?.toLowerCase();
        if (sub === 'activate') {
            await this.activate(client, message);
        }
        else if (sub === 'deactivate') {
            await this.deactivate(client, message);
        }
        else if (sub === 'list') {
            await this.list(client, message);
        }
        else if (sub === 'remove') {
            await this.remove(client, message, args[1]);
        }
        else {
            let prefix = process.env.PREFIX || '$';
            try {
                const gConf = await client.db.guildConfig.findUnique({ where: { guildId: message.guildId } });
                if (gConf && gConf.prefix)
                    prefix = gConf.prefix;
            }
            catch { }
            await message.reply((0, containers_1.cv2)((0, containers_1.container)(`Usage: \`${prefix}247 activate\` or \`${prefix}247 deactivate\``, { title: 'Aura Premium', color: 'default' })));
        }
    },
    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'activate') {
            await this.activate(client, interaction);
        }
        else if (sub === 'deactivate') {
            await this.deactivate(client, interaction);
        }
        else if (sub === 'list') {
            await this.list(client, interaction);
        }
        else if (sub === 'remove') {
            await this.remove(client, interaction, interaction.options.getString('channel_id', true));
        }
    },
    async activate(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        const isPremium = await client.db.premiumUser.findUnique({ where: { userId: authorId } });
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!isPremium && !ownerIds.includes(authorId)) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('This command is exclusively for Premium Users.', { title: 'Aura Premium', color: 'error' })));
        }
        const member = context.member || await context.guild.members.fetch(authorId).catch(() => null);
        if (!member || !member.voice.channel) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('You must be in a voice channel to activate 24/7 mode.', { title: 'Aura 24/7', color: 'error' })));
        }
        const channel = member.voice.channel;
        try {
            await client.db.vc247.upsert({
                where: { guildId: context.guildId },
                update: { channelId: channel.id },
                create: { guildId: context.guildId, channelId: channel.id }
            });
            const player = await client.music.createPlayer({
                guildId: context.guildId,
                textId: context.channelId,
                voiceId: channel.id,
                deaf: true,
                shardId: context.guild.shardId
            });
            await reply((0, containers_1.cv2)((0, containers_1.container)(`24/7 mode activated in **${channel.name}**. The bot will stay in this channel permanently.`, { title: 'Aura 24/7', color: 'success' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Failed to join voice channel: \`${e.message}\``, { title: 'Aura 24/7', color: 'error' })));
        }
    },
    async deactivate(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        const isPremium = await client.db.premiumUser.findUnique({ where: { userId: authorId } });
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!isPremium && !ownerIds.includes(authorId)) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('This command is exclusively for Premium Users.', { title: 'Aura Premium', color: 'error' })));
        }
        const data = await client.db.vc247.findUnique({ where: { guildId: context.guildId } });
        if (!data) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('24/7 mode is not active in this server.', { title: 'Aura 24/7', color: 'error' })));
        }
        await client.db.vc247.delete({ where: { guildId: context.guildId } });
        const player = client.music.players.get(context.guildId);
        if (player) {
            player.destroy();
        }
        await reply((0, containers_1.cv2)((0, containers_1.container)('24/7 mode deactivated. The bot has left the voice channel.', { title: 'Aura 24/7', color: 'success' })));
    },
    async list(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        const isAdmin = await client.db.adminUser.findUnique({ where: { userId: authorId } });
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!isAdmin && !ownerIds.includes(authorId)) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('This command is exclusively for Bot Admins and the Bot Owner.', { title: 'Aura 24/7', color: 'error' })));
        }
        const vcs = await client.db.vc247.findMany();
        if (vcs.length === 0) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('No active 24/7 channels found.', { title: 'Aura 24/7', color: 'error' })));
        }
        const content = vcs.map(v => `• <#${v.channelId}> in Guild \`${v.guildId}\``).join('\n');
        await reply((0, containers_1.cv2)((0, containers_1.container)(content, { title: 'Active 24/7 Channels', color: 'default' })));
    },
    async remove(client, context, channelId) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        const isAdmin = await client.db.adminUser.findUnique({ where: { userId: authorId } });
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!isAdmin && !ownerIds.includes(authorId)) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('This command is exclusively for Bot Admins and the Bot Owner.', { title: 'Aura 24/7', color: 'error' })));
        }
        const vc = await client.db.vc247.findFirst({ where: { channelId } });
        if (!vc) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('That channel ID is not in the active 24/7 list.', { title: 'Aura 24/7', color: 'error' })));
        }
        await client.db.vc247.delete({ where: { guildId: vc.guildId } });
        const player = client.music.players.get(vc.guildId);
        if (player) {
            player.destroy();
        }
        await reply((0, containers_1.cv2)((0, containers_1.container)(`Removed 24/7 mode from DB and disconnected channel \`${channelId}\`.`, { title: 'Aura 24/7', color: 'success' })));
    }
};
