"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const logger_1 = require("../../utils/logger");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('noprefix')
        .setDescription('Manage No-Prefix access for users')
        .addSubcommand(s => s.setName('add').setDescription('Grant no-prefix access').addUserOption(o => o.setName('user').setDescription('The user').setRequired(true)))
        .addSubcommand(s => s.setName('remove').setDescription('Remove no-prefix access').addUserOption(o => o.setName('user').setDescription('The user').setRequired(true)))
        .addSubcommand(s => s.setName('status').setDescription('Check no-prefix access status').addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))),
    category: 'owner',
    aliases: ['np', 'npmanage'],
    async prefixExecute(client, message, args) {
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!ownerIds.includes(message.author.id)) {
            return message.reply((0, containers_1.cv2)((0, containers_1.error)(`You are not authorized!`)));
        }
        const action = args[0]?.toLowerCase();
        const targetMatch = args[1]?.match(/<@!?(\d+)>/) || [null, args[1]];
        const targetId = targetMatch[1];
        if (!action || !targetId) {
            const prefix = process.env.PREFIX || '$';
            return message.reply((0, containers_1.cv2)((0, containers_1.error)(`Usage: \`${prefix}np <add|remove|status> <@user>\``)));
        }
        const user = await client.users.fetch(targetId).catch(() => null);
        if (!user) {
            return message.reply((0, containers_1.cv2)((0, containers_1.error)('Invalid user!')));
        }
        await this.handleAction(client, message, action, user);
    },
    async execute(interaction, client) {
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!ownerIds.includes(interaction.user.id)) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('This command is restricted to the bot owner.')));
        }
        const action = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user', true);
        await this.handleAction(client, interaction, action, user);
    },
    async handleAction(client, context, action, user) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        if (action === 'add') {
            const customPrefix = 'AuraX';
            const select = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId(`${customPrefix}:np_duration:${user.id}`)
                .setPlaceholder('Choose access duration...')
                .addOptions({ label: '1 Week', value: '7' }, { label: '1 Month', value: '30' }, { label: '3 Months', value: '90' }, { label: '6 Months', value: '180' }, { label: 'Lifetime', value: '0' });
            const row = new discord_js_1.ActionRowBuilder().addComponents(select);
            const c = (0, containers_1.container)(`Select the duration for **${user.tag}**'s no-prefix access:`, { title: 'Aura Noprefix' });
            c.addActionRowComponents(row);
            await reply(isInteraction ? { ...(0, containers_1.ephemeralCV2)(c), components: [row] } : (0, containers_1.cv2)(c));
        }
        else if (action === 'remove') {
            const existing = await client.db.noPrefixUser.findUnique({ where: { userId: user.id } });
            if (existing) {
                await client.db.noPrefixUser.delete({ where: { userId: user.id } });
                logger_1.Logger.logNP('Removed', user, 'User was removed from the No-Prefix list.');
                await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully removed **${user.tag}** from no-prefix list.`, { title: 'Aura Owner', color: 'success' })));
            }
            else {
                await reply((0, containers_1.cv2)((0, containers_1.container)(`**${user.tag}** was not in the no-prefix list.`, { title: 'Aura Owner', color: 'error' })));
            }
        }
        else if (action === 'status') {
            const data = await client.db.noPrefixUser.findUnique({ where: { userId: user.id } });
            if (data) {
                const expiry = data.expiresAt ? `<t:${Math.floor(data.expiresAt.getTime() / 1000)}:R>` : 'Lifetime';
                await reply((0, containers_1.cv2)((0, containers_1.container)(`**User:** <@${user.id}>\n**Status:** Active\n**Expiry:** ${expiry}`, { title: 'Aura No-Prefix Status', color: 'success' })));
            }
            else {
                await reply((0, containers_1.cv2)((0, containers_1.container)(`**${user.tag}** does not have no-prefix access.`, { title: 'Aura No-Prefix Status', color: 'error' })));
            }
        }
        else {
            await reply((0, containers_1.cv2)((0, containers_1.container)('Invalid action.', { title: 'Aura Owner', color: 'error' })));
        }
    }
};
