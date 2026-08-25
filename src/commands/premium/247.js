"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");

// ─── Permission-safe reply helper ────────────────────────────────────────────
// Tries to reply in the channel. If bot is missing Send Messages (code 50013),
// falls back to a DM explaining exactly what permissions are needed.
async function safeReply(context, payload, client) {
    try {
        return await context.reply(payload);
    } catch (e) {
        if (e.code === 50013) {
            const userId = context.author?.id || context.user?.id;
            const channelId = context.channelId;
            try {
                const user = context.author || context.user
                    || (userId && await client?.users.fetch(userId).catch(() => null));
                if (user) {
                    await user.send(
                        (0, containers_1.cv2)((0, containers_1.container)(
                            `I don't have permission to send messages in <#${channelId}>.\n\n` +
                            `Please make sure I have the following permissions in that channel:\n` +
                            `• **Send Messages**\n` +
                            `• **Embed Links**\n` +
                            `• **Attach Files**\n` +
                            `• **Read Message History**\n` +
                            `• **Use External Emojis**\n\n` +
                            `For voice channels I also need: **Connect** and **Speak**.`,
                            { title: 'Aura — Missing Permissions', color: 'error' }
                        ))
                    );
                }
            } catch { /* DM also failed (user has DMs closed) */ }
            return;
        }
        throw e;
    }
}

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
        if (sub === 'activate')        await this.activate(client, message);
        else if (sub === 'deactivate') await this.deactivate(client, message);
        else if (sub === 'list')       await this.list(client, message);
        else if (sub === 'remove')     await this.remove(client, message, args[1]);
        else {
            let prefix = process.env.PREFIX || '$';
            try {
                const gConf = await client.db.guildConfig.findUnique({ where: { guildId: message.guildId } });
                if (gConf?.prefix) prefix = gConf.prefix;
            } catch { }
            await safeReply(message,
                (0, containers_1.cv2)((0, containers_1.container)(
                    `Usage: \`${prefix}247 activate\` or \`${prefix}247 deactivate\``,
                    { title: 'Aura Premium', color: 'default' }
                )), client);
        }
    },

    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'activate')        await this.activate(client, interaction);
        else if (sub === 'deactivate') await this.deactivate(client, interaction);
        else if (sub === 'list')       await this.list(client, interaction);
        else if (sub === 'remove')     await this.remove(client, interaction, interaction.options.getString('channel_id', true));
    },

    // ── activate ─────────────────────────────────────────────────────────────
    async activate(client, context) {
        const authorId = context.author?.id || context.user?.id;
        const isPremium = await client.db.premiumUser.findUnique({ where: { userId: authorId } });
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!isPremium && !ownerIds.includes(authorId)) {
            return safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(
                'This command is exclusively for Premium Users.',
                { title: 'Aura Premium', color: 'error' }
            )), client);
        }
        const member = context.member || await context.guild.members.fetch(authorId).catch(() => null);
        if (!member?.voice?.channel) {
            return safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(
                'You must be in a voice channel to activate 24/7 mode.',
                { title: 'Aura 24/7', color: 'error' }
            )), client);
        }
        const channel = member.voice.channel;

        // Pre-check voice channel permissions so we give a clear error before attempting join
        const botMember = context.guild.members.cache.get(client.user.id);
        const voicePerms = channel.permissionsFor(botMember);
        const missing = [];
        if (!voicePerms?.has('Connect'))     missing.push('**Connect**');
        if (!voicePerms?.has('Speak'))       missing.push('**Speak**');
        if (!voicePerms?.has('ViewChannel')) missing.push('**View Channel**');
        if (missing.length) {
            return safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(
                `I'm missing the following permissions in **${channel.name}**:\n${missing.join('\n')}\n\nPlease grant them and try again.`,
                { title: 'Aura 24/7 — Missing Permissions', color: 'error' }
            )), client);
        }

        try {
            await client.db.vc247.upsert({
                where:  { guildId: context.guildId },
                update: { channelId: channel.id },
                create: { guildId: context.guildId, channelId: channel.id }
            });
            await client.music.createPlayer({
                guildId: context.guildId,
                textId:  context.channelId,
                voiceId: channel.id,
                deaf:    true,
                shardId: context.guild.shardId
            });
            await safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(
                `24/7 mode activated in **${channel.name}**. The bot will stay in this channel permanently.`,
                { title: 'Aura 24/7', color: 'success' }
            )), client);
        } catch (e) {
            await safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(
                `Failed to join voice channel: \`${e.message}\``,
                { title: 'Aura 24/7', color: 'error' }
            )), client);
        }
    },

    // ── deactivate ───────────────────────────────────────────────────────────
    async deactivate(client, context) {
        const authorId = context.author?.id || context.user?.id;
        const isPremium = await client.db.premiumUser.findUnique({ where: { userId: authorId } });
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!isPremium && !ownerIds.includes(authorId)) {
            return safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(
                'This command is exclusively for Premium Users.',
                { title: 'Aura Premium', color: 'error' }
            )), client);
        }
        const data = await client.db.vc247.findUnique({ where: { guildId: context.guildId } });
        if (!data) {
            return safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(
                '24/7 mode is not active in this server.',
                { title: 'Aura 24/7', color: 'error' }
            )), client);
        }

        // Remove from DB — bot won't reconnect on next restart
        await client.db.vc247.delete({ where: { guildId: context.guildId } });

        const player = client.music.players.get(context.guildId);
        if (player && (player.playing || player.paused)) {
            // Bug 3 fix: song is active — DON'T force-leave.
            // trackEmpty will fire when the queue finishes; at that point it checks
            // for vc247 in DB, finds nothing, and destroys the player naturally.
            await safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(
                '24/7 mode deactivated. The bot will leave once the current queue finishes.',
                { title: 'Aura 24/7', color: 'success' }
            )), client);
        } else {
            if (player) player.destroy();
            await safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(
                '24/7 mode deactivated. The bot has left the voice channel.',
                { title: 'Aura 24/7', color: 'success' }
            )), client);
        }
    },

    // ── list ─────────────────────────────────────────────────────────────────
    async list(client, context) {
        const authorId = context.author?.id || context.user?.id;
        const isAdmin = await client.db.adminUser.findUnique({ where: { userId: authorId } });
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!isAdmin && !ownerIds.includes(authorId)) {
            return safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(
                'This command is exclusively for Bot Admins and the Bot Owner.',
                { title: 'Aura 24/7', color: 'error' }
            )), client);
        }
        const vcs = await client.db.vc247.findMany();
        if (vcs.length === 0) {
            return safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(
                'No active 24/7 channels found.',
                { title: 'Aura 24/7', color: 'error' }
            )), client);
        }
        const content = vcs.map(v => `• <#${v.channelId}> in Guild \`${v.guildId}\``).join('\n');
        await safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(content, { title: 'Active 24/7 Channels', color: 'default' })), client);
    },

    // ── remove ───────────────────────────────────────────────────────────────
    async remove(client, context, channelId) {
        const authorId = context.author?.id || context.user?.id;
        const isAdmin = await client.db.adminUser.findUnique({ where: { userId: authorId } });
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!isAdmin && !ownerIds.includes(authorId)) {
            return safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(
                'This command is exclusively for Bot Admins and the Bot Owner.',
                { title: 'Aura 24/7', color: 'error' }
            )), client);
        }
        const vc = await client.db.vc247.findFirst({ where: { channelId } });
        if (!vc) {
            return safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(
                'That channel ID is not in the active 24/7 list.',
                { title: 'Aura 24/7', color: 'error' }
            )), client);
        }
        await client.db.vc247.delete({ where: { guildId: vc.guildId } });
        const player = client.music.players.get(vc.guildId);
        if (player) player.destroy();
        await safeReply(context, (0, containers_1.cv2)((0, containers_1.container)(
            `Removed 24/7 mode from DB and disconnected channel \`${channelId}\`.`,
            { title: 'Aura 24/7', color: 'success' }
        )), client);
    }
};
