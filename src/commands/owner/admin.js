"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('admin')
        .setDescription('Manage Admin access for users')
        .addSubcommand(s => s.setName('add').setDescription('Grant admin access').addUserOption(o => o.setName('user').setDescription('The user').setRequired(true)))
        .addSubcommand(s => s.setName('remove').setDescription('Remove admin access').addUserOption(o => o.setName('user').setDescription('The user').setRequired(true)))
        .addSubcommand(s => s.setName('list').setDescription('List admin users')),
    category: 'owner',
    aliases: ['admin'],
    async prefixExecute(client, message, args) {
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!ownerIds.includes(message.author.id))
            return;
        const action = args[0]?.toLowerCase();
        const targetMatch = args[1]?.match(/<@!?(\d+)>/) || [null, args[1]];
        const targetId = targetMatch[1];
        if (!action) {
            const prefix = process.env.PREFIX || '$';
            return message.reply((0, containers_1.cv2)((0, containers_1.error)(`Usage: \`${prefix}admin <add|remove|list> [@user]\``)));
        }
        let user = null;
        if (targetId)
            user = await client.users.fetch(targetId).catch(() => null);
        if (['add', 'remove'].includes(action) && !user) {
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
        const user = interaction.options.getUser('user');
        await this.handleAction(client, interaction, action, user);
    },
    async handleAction(client, context, action, user) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        if (action === 'add' && user) {
            await client.db.adminUser.upsert({
                where: { userId: user.id },
                update: {},
                create: { userId: user.id }
            });
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully added <@${user.id}> to admin list.`, { title: 'Aura Admin', color: 'success' })));
        }
        else if (action === 'remove' && user) {
            const existing = await client.db.adminUser.findUnique({ where: { userId: user.id } });
            if (existing) {
                await client.db.adminUser.delete({ where: { userId: user.id } });
                await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully removed <@${user.id}> from admin list.`, { title: 'Aura Admin', color: 'success' })));
            }
            else {
                await reply((0, containers_1.cv2)((0, containers_1.container)(`**${user.tag}** was not in the admin list.`, { title: 'Aura Admin', color: 'error' })));
            }
        }
        else if (action === 'list') {
            const data = await client.db.adminUser.findMany();
            if (data.length > 0) {
                const usersList = data.map(d => `<@${d.userId}> (\`${d.userId}\`)`).join('\n');
                await reply((0, containers_1.cv2)((0, containers_1.container)(usersList, { title: 'Aura Admin Users', color: 'success' })));
            }
            else {
                await reply((0, containers_1.cv2)((0, containers_1.container)(`No admin users found.`, { title: 'Aura Admin Users', color: 'success' })));
            }
        }
        else {
            await reply((0, containers_1.cv2)((0, containers_1.container)('Invalid action.', { title: 'Aura Admin', color: 'error' })));
        }
    }
};
