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
        .setName('react')
        .setDescription('Manage auto-reactions for this server.')
        .addSubcommand(s => s.setName('add').setDescription('Add an auto-reaction').addStringOption(o => o.setName('trigger').setDescription('Trigger word/phrase').setRequired(true)).addStringOption(o => o.setName('reaction').setDescription('Emoji reaction').setRequired(true)))
        .addSubcommand(s => s.setName('remove').setDescription('Remove an auto-reaction').addStringOption(o => o.setName('trigger').setDescription('Trigger word/phrase').setRequired(true)))
        .addSubcommand(s => s.setName('list').setDescription('List all auto-reactions'))
        .setDefaultMemberPermissions(discord_js_1.PermissionsBitField.Flags.Administrator),
    category: 'auto react & respond',
    aliases: ['react'],
    async prefixExecute(client, message, args) {
        if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
            return message.reply((0, containers_1.cv2)((0, containers_1.container)('You must be a Server Administrator to use this.', { title: 'Missing Permissions', color: 'error' })));
        }
        const sub = args[0]?.toLowerCase();
        if (sub === 'add') {
            const trigger = args[1];
            const reaction = args[2];
            await this.addReact(client, message, trigger, reaction);
        }
        else if (sub === 'remove') {
            const trigger = args[1];
            await this.removeReact(client, message, trigger);
        }
        else if (sub === 'list') {
            await this.listReact(client, message);
        }
        else {
            const prefix = process.env.PREFIX || '$';
            const msg = `## ${emojis_1.default.general.autoreact} Auto React\n${emojis_1.default.general.dot} '${prefix}react add <trigger> <reaction>' - Add an auto-reaction.\n${emojis_1.default.general.dot} '${prefix}react remove <trigger>' - Remove an auto-reaction.\n${emojis_1.default.general.dot} '${prefix}react list' - List all auto-reactions.`;
            await message.reply((0, containers_1.cv2)((0, containers_1.container)(msg, { title: 'Auto-React Manager', color: 'default' })));
        }
    },
    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'add') {
            await this.addReact(client, interaction, interaction.options.getString('trigger', true), interaction.options.getString('reaction', true));
        }
        else if (sub === 'remove') {
            await this.removeReact(client, interaction, interaction.options.getString('trigger', true));
        }
        else if (sub === 'list') {
            await this.listReact(client, interaction);
        }
    },
    async addReact(client, context, trigger, reaction) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        if (!trigger || !reaction) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('Please provide both a trigger and a reaction.', { title: 'Auto React', color: 'error' })));
        }
        try {
            await client.db.autoReact.upsert({
                where: { guildId_trigger: { guildId: context.guildId, trigger: trigger.toLowerCase() } },
                update: { reaction },
                create: { guildId: context.guildId, trigger: trigger.toLowerCase(), reaction }
            });
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully added auto-reaction for \`${trigger}\` ➔ ${reaction}`, { title: 'Aura Auto-React', color: 'success' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Failed to add auto-reaction: ${e.message}`, { title: 'Auto React', color: 'error' })));
        }
    },
    async removeReact(client, context, trigger) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        if (!trigger) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('Please provide a trigger to remove.', { title: 'Auto React', color: 'error' })));
        }
        try {
            await client.db.autoReact.delete({
                where: { guildId_trigger: { guildId: context.guildId, trigger: trigger.toLowerCase() } }
            });
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully removed auto-reaction for \`${trigger}\`.`, { title: 'Aura Auto-React', color: 'success' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`No auto-reaction found for \`${trigger}\`.`, { title: 'Auto React', color: 'error' })));
        }
    },
    async listReact(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const reacts = await client.db.autoReact.findMany({ where: { guildId: context.guildId } });
        if (reacts.length === 0) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('No auto-reactions are currently set up in this server.', { title: 'Aura Auto-React', color: 'default' })));
        }
        const content = reacts.map(r => `\`${r.trigger}\` ➔ ${r.reaction}`).join('\n');
        await reply((0, containers_1.cv2)((0, containers_1.container)(content, { title: 'Auto-Reactions', color: 'default' })));
    }
};
