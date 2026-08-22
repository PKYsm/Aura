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
        .setName('reload')
        .setDescription('Reload all commands or specific components')
        .addStringOption(o => o.setName('target').setDescription('What to reload').setRequired(true).addChoices({ name: 'Commands', value: 'commands' })),
    category: 'owner',
    aliases: ['reload'],
    async prefixExecute(client, message, args) {
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!ownerIds.includes(message.author.id))
            return;
        await this.handleAction(client, message, 'commands');
    },
    async execute(interaction, client) {
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!ownerIds.includes(interaction.user.id)) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('This command is restricted to the bot owner.')));
        }
        const target = interaction.options.getString('target', true);
        await this.handleAction(client, interaction, target);
    },
    async handleAction(client, context, target) {
        const isInteraction = !!context.isCommand;
        const authorId = isInteraction ? context.user.id : context.author.id;
        // Get active players
        const players = client.guildPlayers.size;
        const c = (0, containers_1.container)(`${emojis_1.default.general.dot} Are you sure you want to reload **${target}**?\n${emojis_1.default.general.dot} **Active Players Disrupted:** \`${players}\``, {
            title: 'Confirm Reload',
            color: 'warning'
        });
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId('confirm_reload').setLabel('Confirm').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId('cancel_reload').setLabel('Cancel').setStyle(discord_js_1.ButtonStyle.Danger));
        c.addActionRowComponents(row);
        const message = isInteraction
            ? await context.reply({ ...(0, containers_1.cv2)(c), fetchReply: true })
            : await context.reply((0, containers_1.cv2)(c));
        const collector = message.createMessageComponentCollector({
            componentType: discord_js_1.ComponentType.Button,
            filter: (i) => i.user.id === authorId,
            time: 15000
        });
        collector.on('collect', async (i) => {
            if (i.customId === 'confirm_reload') {
                try {
                    if (target === 'commands') {
                        client.commands.clear();
                        await client.commandHandler.load();
                        await i.update((0, containers_1.cv2)((0, containers_1.container)('Successfully reloaded all commands.', { title: 'Aura Owner', color: 'success' })));
                    }
                    else {
                        await i.update((0, containers_1.cv2)((0, containers_1.container)('Invalid reload target.', { title: 'Aura Owner', color: 'error' })));
                    }
                }
                catch (e) {
                    await i.update((0, containers_1.cv2)((0, containers_1.container)(`Failed to reload \`${target}\`: \`${e.message}\``, { title: 'Reload Error', color: 'error' })));
                }
            }
            else {
                await i.update((0, containers_1.cv2)((0, containers_1.container)('Reload cancelled.', { title: 'Aura Owner', color: 'error' })));
            }
            collector.stop();
        });
        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                message.edit({ components: [] }).catch(() => { });
            }
        });
    }
};
