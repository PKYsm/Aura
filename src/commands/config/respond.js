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
        .setName('respond')
        .setDescription('Manage auto-responses for this server.')
        .addSubcommand(s => s.setName('add').setDescription('Add an auto-response').addStringOption(o => o.setName('trigger').setDescription('Trigger word/phrase').setRequired(true)).addStringOption(o => o.setName('response').setDescription('The response text').setRequired(true)))
        .addSubcommand(s => s.setName('remove').setDescription('Remove an auto-response').addStringOption(o => o.setName('trigger').setDescription('Trigger word/phrase').setRequired(true)))
        .addSubcommand(s => s.setName('list').setDescription('List all auto-responses'))
        .setDefaultMemberPermissions(discord_js_1.PermissionsBitField.Flags.Administrator),
    category: 'auto react & respond',
    aliases: ['respond', 'autorespond'],
    async prefixExecute(client, message, args) {
        if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator)) {
            return message.reply((0, containers_1.cv2)((0, containers_1.container)('You must be a Server Administrator to use this.', { title: 'Missing Permissions', color: 'error' })));
        }
        const sub = args[0]?.toLowerCase();
        if (sub === 'add') {
            const trigger = args[1];
            const response = args.slice(2).join(' ');
            await this.addRespond(client, message, trigger, response);
        }
        else if (sub === 'remove') {
            const trigger = args[1];
            await this.removeRespond(client, message, trigger);
        }
        else if (sub === 'list') {
            await this.listRespond(client, message);
        }
        else {
            const prefix = process.env.PREFIX || '$';
            const msg = `## ${emojis_1.default.general.autoreact} Auto Respond\n${emojis_1.default.general.dot} '${prefix}respond add <trigger> <response>' - Add an auto-response.\n${emojis_1.default.general.dot} '${prefix}respond remove <trigger>' - Remove an auto-response.\n${emojis_1.default.general.dot} '${prefix}respond list' - List all auto-responses.`;
            await message.reply((0, containers_1.cv2)((0, containers_1.container)(msg, { title: 'Auto-Respond Manager', color: 'default' })));
        }
    },
    async execute(interaction, client) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'add') {
            await this.addRespond(client, interaction, interaction.options.getString('trigger', true), interaction.options.getString('response', true));
        }
        else if (sub === 'remove') {
            await this.removeRespond(client, interaction, interaction.options.getString('trigger', true));
        }
        else if (sub === 'list') {
            await this.listRespond(client, interaction);
        }
    },
    async addRespond(client, context, trigger, response) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        if (!trigger || !response) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('Please provide both a trigger and a response.', { title: 'Auto Respond', color: 'error' })));
        }
        try {
            await client.db.autoRespond.upsert({
                where: { guildId_trigger: { guildId: context.guildId, trigger: trigger.toLowerCase() } },
                update: { response },
                create: { guildId: context.guildId, trigger: trigger.toLowerCase(), response }
            });
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully added auto-response for \`${trigger}\` ➔ ${response}`, { title: 'Aura Auto-Respond', color: 'success' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Failed to add auto-response: ${e.message}`, { title: 'Auto Respond', color: 'error' })));
        }
    },
    async removeRespond(client, context, trigger) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        if (!trigger) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('Please provide a trigger to remove.', { title: 'Auto Respond', color: 'error' })));
        }
        try {
            await client.db.autoRespond.delete({
                where: { guildId_trigger: { guildId: context.guildId, trigger: trigger.toLowerCase() } }
            });
            await reply((0, containers_1.cv2)((0, containers_1.container)(`Successfully removed auto-response for \`${trigger}\`.`, { title: 'Aura Auto-Respond', color: 'success' })));
        }
        catch (e) {
            await reply((0, containers_1.cv2)((0, containers_1.container)(`No auto-response found for \`${trigger}\`.`, { title: 'Auto Respond', color: 'error' })));
        }
    },
    async listRespond(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const responds = await client.db.autoRespond.findMany({ where: { guildId: context.guildId } });
        if (responds.length === 0) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('No auto-responses are currently set up in this server.', { title: 'Aura Auto-Respond', color: 'default' })));
        }
        const content = responds.map(r => `\`${r.trigger}\` ➔ ${r.response}`).join('\n');
        await reply((0, containers_1.cv2)((0, containers_1.container)(content, { title: 'Auto-Responses', color: 'default' })));
    }
};
