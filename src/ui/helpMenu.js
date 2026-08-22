"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildHelpMenu = buildHelpMenu;
const discord_js_1 = require("discord.js");
const emojis_1 = __importDefault(require("../utils/emojis"));
const bnameplate_1 = require("../commands/premium/bnameplate");
function buildHelpMenu(category = 'Home', client, userId) {
    const container = new discord_js_1.ContainerBuilder();
    const botAvatarUrl = client.user.displayAvatarURL({ size: 4096 });
    const commandCount = client.commands.filter(cmd => cmd.category?.toLowerCase() !== 'owner').size;
    const prefix = process.env.PREFIX || '$';
    const botId = client.user.id;
    const textTop = `# ${emojis_1.default.help.dance} Aura Help Menu\n### *A Premium Experience Made By Aura Devs*\n\n> ${emojis_1.default.general.stats} **Statistics**\n> ${emojis_1.default.general.dot} **Commands:** \`${commandCount}\`\n> ${emojis_1.default.general.dot} **Prefix:** \`${prefix}\`\n\n`;
    const textBottom = `## ${emojis_1.default.help.peach} **Command Categories**\n\n> ${emojis_1.default.general.music} \`:\` **Music**\n> ${emojis_1.default.general.system} \`:\` **General**\n> ${emojis_1.default.general.autoreact} \`:\` **Config**\n> ${emojis_1.default.general.premium} \`:\` **Premium**\n> ${emojis_1.default.general.fun} \`:\` **Fun**\n\n-# Select a category from the dropdown below to explore commands!`;
    if (category === 'Home') {
        const section = new discord_js_1.SectionBuilder()
            .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(textTop))
            .setThumbnailAccessory(new discord_js_1.ThumbnailBuilder().setURL(botAvatarUrl));
        container.addSectionComponents(section);
        container.addSeparatorComponents(new discord_js_1.SeparatorBuilder());
        container.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(textBottom));
    }
    else {
        const categoryCommands = client.commands.filter(cmd => cmd.category?.toLowerCase() === category.toLowerCase());
        let commandsText = '';
        if (categoryCommands.size > 0) {
            const list = categoryCommands.map(cmd => `\`${cmd.data.name}\``).join(', ');
            commandsText = `## **${category} Commands:**\n> ${list}\n\n`;
        }
        else {
            commandsText = `## **${category} Commands:**\n> No commands found for this category.\n\n`;
        }
        const section = new discord_js_1.SectionBuilder()
            .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(textTop + commandsText))
            .setThumbnailAccessory(new discord_js_1.ThumbnailBuilder().setURL(botAvatarUrl));
        container.addSectionComponents(section);
    }
    container.addSeparatorComponents(new discord_js_1.SeparatorBuilder());
    const selectRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.StringSelectMenuBuilder()
        .setCustomId(`${(0, bnameplate_1.getCustomIdPrefix)(client)}:help_select${userId ? `:${userId}` : ''}`)
        .setPlaceholder('Select a category...')
        .addOptions({ label: "Home", description: "Return to the main help menu", emoji: emojis_1.default.general.home, value: "Home" }, { label: "General", description: "General & Info commands", emoji: emojis_1.default.general.system, value: "General" }, { label: "Music", description: "Music related commands", emoji: emojis_1.default.general.music, value: "Music" }, { label: "Config", description: "Bot Configuration", emoji: emojis_1.default.general.autoreact, value: "Config" }, { label: "Premium", description: "Premium features & commands", emoji: emojis_1.default.general.premium, value: "Premium" }, { label: "Fun", description: "Fun & Games commands", emoji: emojis_1.default.general.fun, value: "Fun" }));
    const buttonRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setLabel("Invite Bot").setURL(`https://discord.com/api/oauth2/authorize?client_id=${botId}&permissions=8&scope=bot%20applications.commands`).setStyle(discord_js_1.ButtonStyle.Link), new discord_js_1.ButtonBuilder().setLabel("Support Server").setURL("https://discord.gg/Vx43JXddFD").setStyle(discord_js_1.ButtonStyle.Link));
    container.addActionRowComponents(selectRow);
    container.addActionRowComponents(buttonRow);
    return container;
}
