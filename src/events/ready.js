"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const chalk_1 = __importDefault(require("chalk"));
const presence_1 = require("../utils/presence");
exports.default = {
    name: discord_js_1.Events.ClientReady,
    once: true,
    async execute(clientNative, client) {
        (0, presence_1.updateBotPresence)(client);
        setInterval(() => {
            (0, presence_1.updateBotPresence)(client);
        }, 15000);
        const applicationCommands = client.commands.map(cmd => cmd.data.toJSON());
        try {
            await client.application?.commands.set(applicationCommands);
        }
        catch (error) {
            console.error(chalk_1.default.red(`[BOT] Failed to register global application commands:`), error);
        }
    }
};
