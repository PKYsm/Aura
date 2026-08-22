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
        .setName('ping')
        .setDescription("Check the bot's latency."),
    category: 'general',
    aliases: ['latency'],
    async execute(interaction, client) {
        const latency = Math.round(client.ws.ping);
        await interaction.reply((0, containers_1.cv2)((0, containers_1.container)(`${emojis_1.default.general.latency} Pong! \n\n**Websocket Latency:** ${latency}ms`, { title: 'Aura Latency' })));
    }
};
