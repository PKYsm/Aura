"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = require("../utils/logger");
exports.default = {
    name: 'guildCreate',
    once: false,
    async execute(guild, client) {
        await logger_1.Logger.logGuild(guild, 'JOIN');
    }
};
