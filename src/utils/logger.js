"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const fs = require("fs");
const path = require("path");
const discord_js_1 = require("discord.js");
const chalk_1 = __importDefault(require("chalk"));
const emojis_1 = __importDefault(require("./emojis"));

const LOGS_DIR = path.join(__dirname, '..', '..', 'logs');
const TAG_WIDTH = 8; // pads tags like "COMMAND"/"GUILD"/"ERROR" so console columns line up

function ensureLogsDir() {
    try {
        if (!fs.existsSync(LOGS_DIR))
            fs.mkdirSync(LOGS_DIR, { recursive: true });
    } catch (e) {
        console.error(chalk_1.default.red('[Logger] Could not create logs/ directory:'), e);
    }
}

function timestamp() {
    return new Date().toISOString();
}

function clockTime() {
    return new Date().toTimeString().slice(0, 8);
}

/** Appends one line to logs/<fileName>, creating the directory/file on first use. */
function writeToFile(fileName, line) {
    try {
        ensureLogsDir();
        fs.appendFileSync(path.join(LOGS_DIR, fileName), line + '\n', 'utf8');
    } catch (e) {
        console.error(chalk_1.default.red('[Logger] Failed to write to log file:'), e);
    }
}

function padTag(tag) {
    return tag.padEnd(TAG_WIDTH, ' ');
}

/** Trims long raw input (message content / reconstructed slash usage) so one console line stays readable. */
function shortenForConsole(text, max = 100) {
    if (!text) return '';
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

async function sendToWebhook(url, payload) {
    if (!url)
        return;
    try {
        const webhook = new discord_js_1.WebhookClient({ url });
        await webhook.send(payload);
    }
    catch (error) {
        console.error('[Logger] Failed to send webhook:', error);
    }
}

exports.Logger = {
    /**
     * Logs a command invocation (slash or prefix) to console (chalk, single line),
     * logs/commands.log (structured line), and the WEBHOOK_COMMAND channel.
     * `rawInput` is the exact text the user typed (prefix) or a reconstructed
     * "/command option:value" string (slash) — this is "what the user's text was".
     */
    logCommand: (user, guild, commandName, type, rawInput) => {
        const guildLabel = guild ? `${guild.name} (${guild.id})` : 'Direct Message';
        const input = rawInput || commandName;

        console.log(`${chalk_1.default.gray(`[${clockTime()}]`)} ${chalk_1.default.bgCyan.black(` ${padTag('COMMAND')}`)} ${chalk_1.default.yellowBright(user.tag)} ${chalk_1.default.gray(`(${user.id})`)} ${chalk_1.default.gray('used')} ${chalk_1.default.greenBright(`[${type}]`)} ${chalk_1.default.whiteBright(commandName)} ${chalk_1.default.gray('in')} ${chalk_1.default.blueBright(guildLabel)}\n` +
            `${' '.repeat(11)}${chalk_1.default.gray('↳ input:')} ${chalk_1.default.dim(shortenForConsole(input))}`);

        writeToFile('commands.log', `[${timestamp()}] COMMAND type=${type} command="${commandName}" user="${user.tag}" userId=${user.id} guild="${guild?.name || 'DM'}" guildId=${guild?.id || 'N/A'} input="${(input || '').replace(/"/g, '\\"')}"`);

        const content = `A command was executed.\n\n${emojis_1.default.general.dot} **Command:** \`${commandName}\` (${type})\n${emojis_1.default.general.dot} **User:** \`${user.tag}\` (\`${user.id}\`)\n${emojis_1.default.general.dot} **Server:** \`${guildLabel}\`\n${emojis_1.default.general.dot} **Input:** \`${shortenForConsole(input, 200)}\``;
        const embed = new discord_js_1.EmbedBuilder().setTitle('Command Executed').setDescription(content).setColor('#7289da').setThumbnail(user.displayAvatarURL());
        sendToWebhook(process.env.WEBHOOK_COMMAND, { username: 'Command Logger', embeds: [embed] });
    },

    /** Logs a guild join/leave to console, logs/guilds.log, and the WEBHOOK_GUILD channel. */
    logGuild: async (guild, action) => {
        const isJoin = action === 'JOIN';
        const title = isJoin ? 'Joined Guild' : 'Left Guild';
        const color = isJoin ? '#43b581' : '#f04747';
        const owner = await guild.fetchOwner().catch(() => null);
        const ownerLabel = owner ? `${owner.user.tag} (${guild.ownerId})` : guild.ownerId;

        const tagColor = isJoin ? chalk_1.default.bgGreen.black : chalk_1.default.bgRed.white;
        console.log(`${chalk_1.default.gray(`[${clockTime()}]`)} ${tagColor(` ${padTag('GUILD')}`)} ${isJoin ? chalk_1.default.greenBright('Joined') : chalk_1.default.redBright('Left')} ${chalk_1.default.whiteBright(guild.name)} ${chalk_1.default.gray(`(${guild.id})`)}\n` +
            `${' '.repeat(11)}${chalk_1.default.gray('↳')} ${chalk_1.default.cyan(guild.memberCount)} ${chalk_1.default.gray('members • owner:')} ${chalk_1.default.magenta(ownerLabel)}`);

        writeToFile('guilds.log', `[${timestamp()}] GUILD action=${action} guild="${guild.name}" guildId=${guild.id} members=${guild.memberCount} owner="${ownerLabel}"`);

        const content = `The bot has ${isJoin ? 'joined a new' : 'been removed from a'} server.\n\n${emojis_1.default.general.dot} **Server Name:** \`${guild.name}\`\n${emojis_1.default.general.dot} **Server ID:** \`${guild.id}\`\n${emojis_1.default.general.dot} **Member Count:** \`${guild.memberCount}\`\n${emojis_1.default.general.dot} **Owner:** \`${ownerLabel}\``;
        const embed = new discord_js_1.EmbedBuilder().setTitle(title).setDescription(content).setColor(color);
        if (guild.iconURL())
            embed.setThumbnail(guild.iconURL());
        await sendToWebhook(process.env.WEBHOOK_GUILD, { username: 'Guild Logger', embeds: [embed] });
    },

    /** Logs an error to console, logs/errors.log, and the WEBHOOK_ERROR channel. */
    logError: (error, context) => {
        const ctxLabel = context || 'Uncaught Exception / Unhandled Rejection';

        console.log(`${chalk_1.default.gray(`[${clockTime()}]`)} ${chalk_1.default.bgRed.white(` ${padTag('ERROR')}`)} ${chalk_1.default.redBright(ctxLabel)} ${chalk_1.default.gray('—')} ${chalk_1.default.white(error.name)}: ${chalk_1.default.gray(error.message)}`);

        writeToFile('errors.log', `[${timestamp()}] ERROR context="${ctxLabel}" name="${error.name}" message="${(error.message || '').replace(/"/g, '\\"')}"\n${error.stack || ''}\n`);

        const content = `An error occurred in the system.\n\n${emojis_1.default.general.dot} **Context:** \`${ctxLabel}\`\n${emojis_1.default.general.dot} **Error Name:** \`${error.name}\`\n\`\`\`js\n${error.stack?.substring(0, 1000) || error.message}\n\`\`\``;
        const embed = new discord_js_1.EmbedBuilder().setTitle('System Error').setDescription(content).setColor('#f04747');
        sendToWebhook(process.env.WEBHOOK_ERROR, { username: 'System Logger', embeds: [embed] });
    },

    logNP: (action, user, details) => {
        console.log(`${chalk_1.default.gray(`[${clockTime()}]`)} ${chalk_1.default.bgYellow.black(` ${padTag('NP')}`)} ${chalk_1.default.yellow(action)} ${chalk_1.default.gray('for')} ${chalk_1.default.whiteBright(user.tag)} ${chalk_1.default.gray(`(${user.id})`)} ${chalk_1.default.dim('— ' + details)}`);
        writeToFile('commands.log', `[${timestamp()}] NOPREFIX action=${action} user="${user.tag}" userId=${user.id} details="${details}"`);
        const content = `No-Prefix update detected.\n\n${emojis_1.default.general.dot} **Action:** \`${action}\`\n${emojis_1.default.general.dot} **Target User:** \`${user.tag}\` (\`${user.id}\`)\n\n**Details:**\n> ${details}`;
        const embed = new discord_js_1.EmbedBuilder().setTitle('No Prefix Log').setDescription(content).setColor('#f1c40f').setThumbnail(user.displayAvatarURL());
        sendToWebhook(process.env.WEBHOOK_NP, { username: 'NP Logger', embeds: [embed] });
    },

    logPremium: (action, user, details) => {
        console.log(`${chalk_1.default.gray(`[${clockTime()}]`)} ${chalk_1.default.bgMagenta.white(` ${padTag('PREMIUM')}`)} ${chalk_1.default.magentaBright(action)} ${chalk_1.default.gray('for')} ${chalk_1.default.whiteBright(user.tag)} ${chalk_1.default.gray(`(${user.id})`)} ${chalk_1.default.dim('— ' + details)}`);
        writeToFile('commands.log', `[${timestamp()}] PREMIUM action=${action} user="${user.tag}" userId=${user.id} details="${details}"`);
        const content = `Premium subscription update.\n\n${emojis_1.default.general.dot} **Action:** \`${action}\`\n${emojis_1.default.general.dot} **User:** \`${user.tag}\` (\`${user.id}\`)\n\n**Details:**\n> ${details}`;
        const embed = new discord_js_1.EmbedBuilder().setTitle('Premium Log').setDescription(content).setColor('#f1c40f').setThumbnail(user.displayAvatarURL());
        sendToWebhook(process.env.WEBHOOK_PREMIUM, { username: 'Premium Logger', embeds: [embed] });
    }
};
