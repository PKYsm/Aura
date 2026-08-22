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
        .setName('restart')
        .setDescription('Restart the bot (respawn all shards)'),
    category: 'owner',
    aliases: ['restart', 'reboot'],
    async prefixExecute(client, message, args) {
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!ownerIds.includes(message.author.id))
            return;
        await this.handleAction(client, message);
    },
    async execute(interaction, client) {
        const ownerIds = process.env.OWNER_ID?.split(',').map(id => id.trim()) || [];
        if (!ownerIds.includes(interaction.user.id)) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('This command is restricted to the bot owner.')));
        }
        await this.handleAction(client, interaction);
    },
    async handleAction(client, context) {
        const isInteraction = !!context.isCommand;
        const authorId = isInteraction ? context.user.id : context.author.id;
        // Get active players
        const players = client.guildPlayers.size;
        const c = (0, containers_1.container)(`${emojis_1.default.general.dot} Are you sure you want to **RESTART** the bot?\n${emojis_1.default.general.dot} **Active Players Disrupted:** \`${players}\``, {
            title: 'Confirm Restart',
            color: 'warning'
        });
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId('confirm_restart').setLabel('Confirm').setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder().setCustomId('cancel_restart').setLabel('Cancel').setStyle(discord_js_1.ButtonStyle.Danger));
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
            if (i.customId === 'confirm_restart') {
                try {
                    await i.update((0, containers_1.cv2)((0, containers_1.container)('Shutting down and restarting the bot...', { title: 'Aura Owner', color: 'success' })));
                    setTimeout(() => {
                        client.destroy();
                        process.exit(0);
                    }, 1000);
                }
                catch (e) {
                    await i.update((0, containers_1.cv2)((0, containers_1.container)(`Failed to restart: \`${e.message}\``, { title: 'Restart Error', color: 'error' })));
                }
            }
            else {
                await i.update((0, containers_1.cv2)((0, containers_1.container)('Restart cancelled.', { title: 'Aura Owner', color: 'error' })));
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
