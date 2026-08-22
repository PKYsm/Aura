"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const helpMenu_1 = require("../../ui/helpMenu");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('help')
        .setDescription('View the full help menu for Aura Music.'),
    category: 'general',
    aliases: ['h', 'commands'],
    async execute(interaction, client) {
        const userId = interaction.user.id;
        const c = (0, helpMenu_1.buildHelpMenu)('Home', client, userId);
        await interaction.reply((0, containers_1.cv2)(c));
    }
};
