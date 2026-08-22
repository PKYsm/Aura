"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const logger_1 = require("../../utils/logger");
const ms_1 = __importDefault(require("ms"));
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('premium')
        .setDescription('Manage Premium access for users')
        .addSubcommand(s => s.setName('add').setDescription('Grant premium access')
        .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true))
        .addStringOption(o => o.setName('timelimit').setDescription('Optional limit (e.g. 30d, 1y)').setRequired(false)))
        .addSubcommand(s => s.setName('remove').setDescription('Remove premium access')
        .addUserOption(o => o.setName('user').setDescription('The user').setRequired(true)))
        .addSubcommand(s => s.setName('list').setDescription('List premium users'))
        .addSubcommand(s => s.setName('status').setDescription('Check premium access status')
        .addUserOption(o => o.setName('user').setDescription('The user').setRequired(false))),
    category: 'owner',
    aliases: ['premium'],
    async prefixExecute(client, message, args) {
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!ownerIds.includes(message.author.id))
            return;
        const action = args[0]?.toLowerCase();
        const targetMatch = args[1]?.match(/<@!?(\d+)>/) || [null, args[1]];
        const targetId = targetMatch[1];
        const timelimit = args[2] || null;
        if (!action) {
            const prefix = process.env.PREFIX || '$';
            return message.reply((0, containers_1.cv2)((0, containers_1.error)(`Usage: \`${prefix}premium <add|remove|list|status> [@user] [timelimit]\``)));
        }
        let user = null;
        if (targetId)
            user = await client.users.fetch(targetId).catch(() => null);
        if (action === 'status' && !user)
            user = message.author;
        if (['add', 'remove'].includes(action) && !user) {
            return message.reply((0, containers_1.cv2)((0, containers_1.error)('Invalid user!')));
        }
        await this.handleAction(client, message, action, user, timelimit);
    },
    async execute(interaction, client) {
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!ownerIds.includes(interaction.user.id)) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('This command is restricted to the bot owner.')));
        }
        const action = interaction.options.getSubcommand();
        const user = interaction.options.getUser('user') || interaction.user;
        const timelimit = interaction.options.getString('timelimit');
        await this.handleAction(client, interaction, action, user, timelimit);
    },
    async handleAction(client, context, action, user, timelimit = null) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        if (action === 'add' && user) {
            if (timelimit) {
                const durationMs = (0, ms_1.default)(timelimit);
                if (!durationMs) {
                    return reply((0, containers_1.cv2)((0, containers_1.error)('Invalid time format. Please use formats like 30d, 1y, 6m.')));
                }
                const expiresAt = new Date(Date.now() + durationMs);
                await client.db.premiumUser.upsert({
                    where: { userId: user.id },
                    update: { expiresAt },
                    create: { userId: user.id, expiresAt }
                });
                const timeStr = `until <t:${Math.floor(expiresAt.getTime() / 1000)}:f>`;
                logger_1.Logger.logPremium('Added', user, `User was granted premium access ${timeStr}.`);
                await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully added <@${user.id}> to premium list ${timeStr}.`, { title: 'Aura Premium', color: 'success' })));
            }
            else {
                const customPrefix = 'AuraX';
                const select = new discord_js_1.StringSelectMenuBuilder()
                    .setCustomId(`${customPrefix}:premium_duration:${user.id}`)
                    .setPlaceholder('Choose access duration...')
                    .addOptions({ label: '1 Week', value: '7' }, { label: '1 Month', value: '30' }, { label: '6 Months', value: '180' }, { label: '1 Year', value: '365' }, { label: '3 Years', value: '1095' }, { label: 'Lifetime', value: '0' });
                const row = new discord_js_1.ActionRowBuilder().addComponents(select);
                const c = (0, containers_1.container)(`Select the duration for <@${user.id}>'s premium access:`, { title: 'Aura Premium' });
                c.addActionRowComponents(row);
                await reply(isInteraction ? { ...(0, containers_1.ephemeralCV2)(c), components: [row] } : (0, containers_1.cv2)(c));
            }
        }
        else if (action === 'remove' && user) {
            const existing = await client.db.premiumUser.findUnique({ where: { userId: user.id } });
            if (existing) {
                await client.db.premiumUser.delete({ where: { userId: user.id } });
                logger_1.Logger.logPremium('Removed', user, 'User had their premium access revoked.');
                await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully removed <@${user.id}> from premium list.`, { title: 'Aura Premium', color: 'success' })));
            }
            else {
                await reply((0, containers_1.cv2)((0, containers_1.container)(`**${user.tag}** was not in the premium list.`, { title: 'Aura Premium', color: 'error' })));
            }
        }
        else if (action === 'list') {
            const data = await client.db.premiumUser.findMany();
            if (data.length > 0) {
                const usersList = data.map(d => `<@${d.userId}> - ` + (d.expiresAt ? `<t:${Math.floor(d.expiresAt.getTime() / 1000)}:R>` : 'Lifetime')).join('\n');
                await reply((0, containers_1.cv2)((0, containers_1.container)(usersList, { title: 'Aura Premium Users', color: 'success' })));
            }
            else {
                await reply((0, containers_1.cv2)((0, containers_1.container)(`No premium users found.`, { title: 'Aura Premium Users', color: 'success' })));
            }
        }
        else if (action === 'status') {
            const targetUser = user || context.author || context.user;
            const data = await client.db.premiumUser.findUnique({ where: { userId: targetUser.id } });
            if (data) {
                const expiry = data.expiresAt ? `<t:${Math.floor(data.expiresAt.getTime() / 1000)}:R>` : 'Lifetime';
                await reply((0, containers_1.cv2)((0, containers_1.container)(`**User:** <@${targetUser.id}>\n**Status:** Premium Active 💎\n**Expiry:** ${expiry}`, { title: 'Aura Premium Status', color: 'success' })));
            }
            else {
                await reply((0, containers_1.cv2)((0, containers_1.container)(`**User:** <@${targetUser.id}>\n**Status:** Not Premium ❌`, { title: 'Aura Premium Status', color: 'error' })));
            }
        }
        else {
            await reply((0, containers_1.cv2)((0, containers_1.container)('Invalid action.', { title: 'Aura Premium', color: 'error' })));
        }
    }
};
