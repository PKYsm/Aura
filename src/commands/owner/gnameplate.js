"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildGlobalNameplateUI = buildGlobalNameplateUI;
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const emojis_1 = __importDefault(require("../../utils/emojis"));
const bnameplate_1 = require("../premium/bnameplate");
async function buildGlobalNameplateUI(client, fontId, effectId, colorId, callerId, menuType = 'main') {
    const containerBuilder = new discord_js_1.ContainerBuilder();
    const fontName = bnameplate_1.FONTS[fontId]?.name || 'Default';
    const effectName = bnameplate_1.EFFECTS[effectId]?.name || 'Solid';
    let colorName = bnameplate_1.COLORS[colorId]?.name || 'White';
    if (colorId === 999) {
        const cached = client.nameplateCache?.get(`GLOBAL-${callerId}`);
        if (cached?.hexColors) {
            const displayHex = effectId === 2 ? cached.hexColors : [cached.hexColors[0]];
            colorName = `Custom (${displayHex.map((h) => h.startsWith('#') ? h : '#' + h).join(', ')})`;
        }
        else {
            colorName = 'Custom (Not Set)';
        }
    }
    const textContent = "# " + emojis_1.default.general.settings + " Global Nameplate Customizer\n*Change the bot's display name for ALL servers that haven't customized it themselves.*\n\n" + emojis_1.default.general.dot + " **Font:** `" + fontName + "` (ID: " + fontId + ")\n" + emojis_1.default.general.dot + " **Text Effect:** `" + effectName + "` (ID: " + effectId + ")\n" + emojis_1.default.general.dot + " **Color:** `" + colorName + "` (ID: " + colorId + ")\n\n" + emojis_1.default.general.premium + " *This will overwrite the default look everywhere!*";
    containerBuilder.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(textContent));
    containerBuilder.addSeparatorComponents(new discord_js_1.SeparatorBuilder());
    const customPrefix = (0, bnameplate_1.getCustomIdPrefix)(client);
    if (menuType === 'main') {
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`${customPrefix}:gnp:font_menu:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setLabel('Choose Font')
            .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
            .setCustomId(`${customPrefix}:gnp:style_menu:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setLabel('Choose Text Effect')
            .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
            .setCustomId(`${customPrefix}:gnp:color_menu:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setLabel('Choose Colour')
            .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
            .setCustomId(`${customPrefix}:gnp:save:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setLabel('Save Globally')
            .setEmoji(emojis_1.default.general.tick)
            .setStyle(discord_js_1.ButtonStyle.Success));
        containerBuilder.addActionRowComponents(row);
    }
    else if (menuType === 'font') {
        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`${customPrefix}:gnp:set_font:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setPlaceholder('Select a font...')
            .addOptions(Object.entries(bnameplate_1.FONTS).map(([id, info]) => ({
            label: info.name,
            value: id,
            description: `Apply the ${info.name} font.`
        })));
        const btnRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`${customPrefix}:gnp:main:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setLabel('Back')
            .setStyle(discord_js_1.ButtonStyle.Secondary));
        containerBuilder.addActionRowComponents(new discord_js_1.ActionRowBuilder().addComponents(select));
        containerBuilder.addActionRowComponents(btnRow);
    }
    else if (menuType === 'style') {
        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`${customPrefix}:gnp:set_style:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setPlaceholder('Select a text effect...')
            .addOptions(Object.entries(bnameplate_1.EFFECTS).map(([id, info]) => ({
            label: info.name,
            value: id,
            description: info.colorReq
        })));
        const btnRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`${customPrefix}:gnp:main:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setLabel('Back')
            .setStyle(discord_js_1.ButtonStyle.Secondary));
        containerBuilder.addActionRowComponents(new discord_js_1.ActionRowBuilder().addComponents(select));
        containerBuilder.addActionRowComponents(btnRow);
    }
    else if (menuType === 'color') {
        if (effectId === 2) {
            const selectOptions1 = [
                ...Object.entries(bnameplate_1.COLORS).map(([id, info]) => ({
                    label: info.name,
                    value: id,
                    description: `Set first gradient color to ${info.name}.`
                })),
                {
                    label: 'Custom Color',
                    value: 'custom',
                    description: 'Enter custom Hex color code(s).'
                }
            ];
            const selectOptions2 = [
                ...Object.entries(bnameplate_1.COLORS).map(([id, info]) => ({
                    label: info.name,
                    value: id,
                    description: `Set second gradient color to ${info.name}.`
                })),
                {
                    label: 'Custom Color',
                    value: 'custom',
                    description: 'Enter custom Hex color code(s).'
                }
            ];
            const select1 = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId(`${customPrefix}:gnp:set_color_grad1:${fontId}:${effectId}:${colorId}:${callerId}`)
                .setPlaceholder('Select First Gradient Color...')
                .addOptions(selectOptions1);
            const select2 = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId(`${customPrefix}:gnp:set_color_grad2:${fontId}:${effectId}:${colorId}:${callerId}`)
                .setPlaceholder('Select Second Gradient Color...')
                .addOptions(selectOptions2);
            const btnRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId(`${customPrefix}:gnp:main:${fontId}:${effectId}:${colorId}:${callerId}`)
                .setLabel('Back')
                .setStyle(discord_js_1.ButtonStyle.Secondary));
            containerBuilder.addActionRowComponents(new discord_js_1.ActionRowBuilder().addComponents(select1));
            containerBuilder.addActionRowComponents(new discord_js_1.ActionRowBuilder().addComponents(select2));
            containerBuilder.addActionRowComponents(btnRow);
        }
        else {
            const selectOptions = [
                ...Object.entries(bnameplate_1.COLORS).map(([id, info]) => ({
                    label: info.name,
                    value: id,
                    description: `Apply the ${info.name} color.`
                })),
                {
                    label: 'Custom Color',
                    value: 'custom',
                    description: 'Enter custom Hex color code(s).'
                }
            ];
            const select = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId(`${customPrefix}:gnp:set_color:${fontId}:${effectId}:${colorId}:${callerId}`)
                .setPlaceholder('Select a color theme...')
                .addOptions(selectOptions);
            const btnRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId(`${customPrefix}:gnp:main:${fontId}:${effectId}:${colorId}:${callerId}`)
                .setLabel('Back')
                .setStyle(discord_js_1.ButtonStyle.Secondary));
            containerBuilder.addActionRowComponents(new discord_js_1.ActionRowBuilder().addComponents(select));
            containerBuilder.addActionRowComponents(btnRow);
        }
    }
    return containerBuilder;
}
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('gnameplate')
        .setDescription('Change the bot\'s display nameplate globally (Owner Only).')
        .setDefaultMemberPermissions(discord_js_1.PermissionsBitField.Flags.Administrator),
    category: 'owner',
    aliases: ['gnameplate', 'gstyle'],
    async prefixExecute(client, message, args) {
        await this.handleAction(client, message);
    },
    async execute(interaction, client) {
        await this.handleAction(client, interaction);
    },
    async handleAction(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        const ownerIds = process.env.OWNER_ID?.split(',').map((id) => id.trim()) || [];
        if (!ownerIds.includes(authorId)) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('You must be a Bot Owner to use this command.', { title: 'Missing Permissions', color: 'error' })));
        }
        const fontId = 11;
        const effectId = 1;
        const colorId = 9;
        const ui = await buildGlobalNameplateUI(client, fontId, effectId, colorId, authorId, 'main');
        await reply((0, containers_1.cv2)(ui));
    }
};
