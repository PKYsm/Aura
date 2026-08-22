"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const emojis_1 = __importDefault(require("../../utils/emojis"));
const bnameplate_1 = require("../premium/bnameplate");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('filters')
        .setDescription('Apply audio filters to the currently playing song'),
    category: 'music',
    aliases: ['filter', 'effects', 'eq'],
    async execute(interaction, client) {
        await this.handleAction(client, interaction);
    },
    async prefixExecute(client, message, args) {
        await this.handleAction(client, message);
    },
    async handleAction(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const member = isInteraction ? context.member : context.member;
        const voiceChannel = member?.voice.channel;
        if (!voiceChannel) {
            return reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('You need to be in a voice channel to use filters!')));
        }
        const player = client.music.players.get(context.guildId);
        if (!player || !player.queue.current) {
            return reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('There is no music playing right now.')));
        }
        const availableFilters = [
            { id: 'clear', name: 'Clear Filters' },
            { id: 'bass', name: 'Bass Boost' },
            { id: 'treble', name: 'Treble Boost' },
            { id: 'nightcore', name: 'Nightcore' },
            { id: 'vaporwave', name: 'Vaporwave' },
            { id: '8d', name: '8D Audio' },
            { id: 'karaoke', name: 'Karaoke' },
            { id: 'soft', name: 'Soft' },
            { id: 'tremolo', name: 'Tremolo' },
            { id: 'vibrato', name: 'Vibrato' },
            { id: 'distortion', name: 'Distortion' }
        ];
        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`${(0, bnameplate_1.getCustomIdPrefix)(client)}:filter_select`)
            .setPlaceholder('Select an audio filter to apply...');
        availableFilters.forEach(filter => {
            select.addOptions({
                label: filter.name,
                value: filter.id
            });
        });
        const row = new discord_js_1.ActionRowBuilder().addComponents(select);
        const c = (0, containers_1.container)(`**Audio Filters Menu**\nSelect a filter from the dropdown below to apply it to the music. You can stack some filters or clear them completely.\n\n${emojis_1.default.general.dot} **Note:** It might take a few seconds for the filter to apply.`, { title: 'Music Filters' });
        c.addActionRowComponents(row);
        await reply((0, containers_1.cv2)(c));
    }
};
