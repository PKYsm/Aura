"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
const discord_js_1 = require("discord.js");
const emojis_1 = __importDefault(require("./emojis"));
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
    logError: async (error, context) => {
        const title = 'System Error';
        const content = `An error occurred in the system.\n\n${emojis_1.default.general.dot} **Context:** \`${context || 'Uncaught Exception / Unhandled Rejection'}\`\n${emojis_1.default.general.dot} **Error Name:** \`${error.name}\`\n\`\`\`js\n${error.stack?.substring(0, 1000) || error.message}\n\`\`\``;
        const embed = new discord_js_1.EmbedBuilder().setTitle(title).setDescription(content).setColor('#f04747');
        await sendToWebhook(process.env.WEBHOOK_ERROR, {
            username: 'System Logger',
            embeds: [embed]
        });
    },
    logGuild: async (guild, action) => {
        const title = action === 'JOIN' ? 'Joined Guild' : 'Left Guild';
        const color = action === 'JOIN' ? '#43b581' : '#f04747';
        const owner = await guild.fetchOwner().catch(() => null);
        const content = `The bot has ${action === 'JOIN' ? 'joined a new' : 'been removed from a'} server.\n\n${emojis_1.default.general.dot} **Server Name:** \`${guild.name}\`\n${emojis_1.default.general.dot} **Server ID:** \`${guild.id}\`\n${emojis_1.default.general.dot} **Member Count:** \`${guild.memberCount}\`\n${emojis_1.default.general.dot} **Owner:** \`${owner?.user.tag || 'Unknown'}\` (\`${guild.ownerId}\`)`;
        const embed = new discord_js_1.EmbedBuilder().setTitle(title).setDescription(content).setColor(color);
        if (guild.iconURL())
            embed.setThumbnail(guild.iconURL());
        await sendToWebhook(process.env.WEBHOOK_GUILD, {
            username: 'Guild Logger',
            embeds: [embed]
        });
    },
    logCommand: async (user, guild, commandName, type) => {
        const content = `A command was executed.\n\n${emojis_1.default.general.dot} **Command:** \`${commandName}\` (${type})\n${emojis_1.default.general.dot} **User:** \`${user.tag}\` (\`${user.id}\`)\n${emojis_1.default.general.dot} **Server:** \`${guild?.name || 'Direct Message'}\` (\`${guild?.id || 'N/A'}\`)`;
        const embed = new discord_js_1.EmbedBuilder().setTitle('Command Executed').setDescription(content).setColor('#7289da').setThumbnail(user.displayAvatarURL());
        await sendToWebhook(process.env.WEBHOOK_COMMAND, {
            username: 'Command Logger',
            embeds: [embed]
        });
    },
    logNP: async (action, user, details) => {
        const content = `No-Prefix update detected.\n\n${emojis_1.default.general.dot} **Action:** \`${action}\`\n${emojis_1.default.general.dot} **Target User:** \`${user.tag}\` (\`${user.id}\`)\n\n**Details:**\n> ${details}`;
        const embed = new discord_js_1.EmbedBuilder().setTitle('No Prefix Log').setDescription(content).setColor('#f1c40f').setThumbnail(user.displayAvatarURL());
        await sendToWebhook(process.env.WEBHOOK_NP, {
            username: 'NP Logger',
            embeds: [embed]
        });
    },
    logPremium: async (action, user, details) => {
        const content = `Premium subscription update.\n\n${emojis_1.default.general.dot} **Action:** \`${action}\`\n${emojis_1.default.general.dot} **User:** \`${user.tag}\` (\`${user.id}\`)\n\n**Details:**\n> ${details}`;
        const embed = new discord_js_1.EmbedBuilder().setTitle('Premium Log').setDescription(content).setColor('#f1c40f').setThumbnail(user.displayAvatarURL());
        await sendToWebhook(process.env.WEBHOOK_PREMIUM, {
            username: 'Premium Logger',
            embeds: [embed]
        });
    }
};
