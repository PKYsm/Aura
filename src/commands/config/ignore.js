"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('ignore')
        .setDescription('Manage ignored channels.')
        .addSubcommand(s => s.setName('channel').setDescription('Add a channel to the ignore list').addChannelOption(o => o.setName('channel').setDescription('The channel').setRequired(false).addChannelTypes(discord_js_1.ChannelType.GuildText)))
        .addSubcommand(s => s.setName('remove').setDescription('Remove a channel from the ignore list').addChannelOption(o => o.setName('channel').setDescription('The channel').setRequired(false).addChannelTypes(discord_js_1.ChannelType.GuildText)))
        .addSubcommand(s => s.setName('list').setDescription('List all ignored channels'))
        .setDefaultMemberPermissions(discord_js_1.PermissionsBitField.Flags.Administrator),
    category: 'ignore',
    aliases: ['ignore'],
    async prefixExecute(client, message, args) {
        if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
            return message.reply((0, containers_1.cv2)((0, containers_1.container)('You must be a Server Administrator to use this.', { title: 'Missing Permissions', color: 'error' })));
        }
        const sub = args[0]?.toLowerCase();
        const channelId = message.mentions.channels.first()?.id || args[1] || message.channel.id;
        if (sub === 'channel' || sub === 'add') {
            await this.addIgnore(client, message, channelId);
        }
        else if (sub === 'remove') {
            await this.removeIgnore(client, message, channelId);
        }
        else if (sub === 'list') {
            await this.listIgnore(client, message);
        }
        else {
            await message.reply((0, containers_1.cv2)((0, containers_1.container)('Invalid subcommand. Use `add`, `remove`, or `list`.', { title: 'Aura Ignore', color: 'error' })));
        }
    },
    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        const channelId = interaction.options.getChannel('channel')?.id || interaction.channelId;
        if (sub === 'channel') {
            await this.addIgnore(client, interaction, channelId);
        }
        else if (sub === 'remove') {
            await this.removeIgnore(client, interaction, channelId);
        }
        else if (sub === 'list') {
            await this.listIgnore(client, interaction);
        }
    },
    async addIgnore(client, context, channelId) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        try {
            await client.db.ignoredChannel.upsert({
                where: { guildId_channelId: { guildId: context.guildId, channelId } },
                update: {},
                create: { guildId: context.guildId, channelId }
            });
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully added <#${channelId}> to ignored channels.`, { title: 'Aura Ignore', color: 'success' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Failed to ignore channel: ${e.message}`, { title: 'Aura Ignore', color: 'error' })));
        }
    },
    async removeIgnore(client, context, channelId) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        try {
            await client.db.ignoredChannel.delete({
                where: { guildId_channelId: { guildId: context.guildId, channelId } }
            });
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully removed <#${channelId}> from ignored channels.`, { title: 'Aura Ignore', color: 'success' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`<#${channelId}> was not in the ignored channels list.`, { title: 'Aura Ignore', color: 'error' })));
        }
    },
    async listIgnore(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const channels = await client.db.ignoredChannel.findMany({ where: { guildId: context.guildId } });
        if (channels.length === 0) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('No channels are currently ignored in this server.', { title: 'Aura Ignore', color: 'default' })));
        }
        const content = channels.map(c => `<#${c.channelId}> (\`${c.channelId}\`)`).join('\n');
        await reply((0, containers_1.cv2)((0, containers_1.container)(content, { title: 'Ignored Channels', color: 'default' })));
    }
};
