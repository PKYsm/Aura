"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const path_1 = require("path");
require("dotenv/config");
const chalk_1 = __importDefault(require("chalk"));
const gradient_string_1 = __importDefault(require("gradient-string"));
console.clear();
const themeGradient = (0, gradient_string_1.default)('#FF00D9', '#00E7FF', '#AD00FF');
const ascii = `
    ███████╗███████╗██████╗  ██████╗ ██╗  ██╗
    ██╔════╝██╔════╝██╔══██╗██╔═══██╗╚██╗██╔╝
    █████╗  █████╗  ██████╔╝██║   ██║ ╚███╔╝ 
    ██╔══╝  ██╔══╝  ██╔══██╗██║   ██║ ██╔██╗ 
    ██║     ███████╗██║  ██║╚██████╔╝██╔╝ ██╗
    ╚═╝     ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝
`;
console.log(themeGradient.multiline(ascii));
console.log(chalk_1.default.gray('    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
console.log(chalk_1.default.gray(`    [SYSTEM] Initializing Aura Sharding Manager...`));
const targetBotFile = (0, path_1.join)(__dirname, 'bot.js');
const manager = new discord_js_1.ShardingManager(targetBotFile, {
    token: process.env.BOT_TOKEN,
    execArgv: ['--max-old-space-size=256']
});
manager.on('shardCreate', shard => {
    const shardPrefix = themeGradient(`[SHARD #${shard.id}]`);
    console.log(`${shardPrefix} ${chalk_1.default.cyan('Launched successfully.')}`);
    shard.on('ready', () => {
        console.log(`${shardPrefix} ${chalk_1.default.greenBright('Operational and ready!')}`);
    });
    shard.on('disconnect', () => {
        console.log(`${shardPrefix} ${chalk_1.default.red('Disconnected from gateway.')}`);
    });
    shard.on('reconnecting', () => {
        console.log(`${shardPrefix} ${chalk_1.default.yellow('Attempting to reconnect...')}`);
    });
});
manager.spawn({ timeout: -1 }).catch(error => {
    console.error(chalk_1.default.red('[SHARDING ERROR]'), error);
});
