"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomIdPrefix = exports.COLORS = exports.EFFECTS = exports.FONTS = void 0;
exports.buildNameplateUI = buildNameplateUI;
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const emojis_1 = __importDefault(require("../../utils/emojis"));
exports.FONTS = {
    11: { name: 'Default' },
    1: { name: 'Tempo' },
    3: { name: 'Sakura' },
    4: { name: 'Jellybean' },
    6: { name: 'Modern' },
    7: { name: 'Medieval' },
    8: { name: '8bit' },
    10: { name: 'Vampyre' }
};
exports.EFFECTS = {
    1: { name: 'Solid', id: 1, colorReq: 'Requires exactly 1 color' },
    2: { name: 'Gradient', id: 2, colorReq: 'Requires exactly 2 colors (for blending)' },
    3: { name: 'Neon', id: 3, colorReq: 'Requires exactly 1 color' },
    4: { name: 'Toon', id: 4, colorReq: 'Requires exactly 1 color' },
    5: { name: 'Pop', id: 5, colorReq: 'Requires exactly 1 color' },
    6: { name: 'Glow', id: 6, colorReq: 'Requires exactly 1 color' }
};
exports.COLORS = {
    1: { name: 'Red', colors: [16711680] },
    2: { name: 'Green', colors: [65280] },
    3: { name: 'Blue', colors: [255] },
    4: { name: 'Yellow', colors: [16776960] },
    5: { name: 'Purple', colors: [8388736] },
    6: { name: 'Cyan', colors: [65535] },
    7: { name: 'Orange', colors: [16753920] },
    8: { name: 'Pink', colors: [16761035] },
    9: { name: 'White', colors: [16777215] }
};
const getCustomIdPrefix = (client) => { return 'AuraX'; };
exports.getCustomIdPrefix = getCustomIdPrefix;
async function buildNameplateUI(client, fontId, effectId, colorId, callerId, menuType = 'main', guildId) {
    const containerBuilder = new discord_js_1.ContainerBuilder();
    const fontName = exports.FONTS[fontId]?.name || 'Default';
    const effectName = exports.EFFECTS[effectId]?.name || 'Solid';
    let colorName = exports.COLORS[colorId]?.name || 'White';
    if (colorId === 999 && guildId) {
        const cached = client.nameplateCache?.get(`${guildId}-${callerId}`);
        if (cached?.hexColors) {
            const displayHex = effectId === 2 ? cached.hexColors : [cached.hexColors[0]];
            colorName = `Custom (${displayHex.map((h) => h.startsWith('#') ? h : '#' + h).join(', ')})`;
        }
        else {
            colorName = 'Custom (Not Set)';
        }
    }
    const textContent = "# " + emojis_1.default.general.customization + " Bot Nameplate Customizer\n*Change the typography, text effects, and colors of the bot's display name in this server.*\n\n" + emojis_1.default.general.dot + " **Font:** `" + fontName + "` (ID: " + fontId + ")\n" + emojis_1.default.general.dot + " **Text Effect:** `" + effectName + "` (ID: " + effectId + ")\n" + emojis_1.default.general.dot + " **Color:** `" + colorName + "` (ID: " + colorId + ")\n\n" + emojis_1.default.general.premium + " *This premium styling only applies to this server. Click **Save** to apply!*";
    containerBuilder.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(textContent));
    containerBuilder.addSeparatorComponents(new discord_js_1.SeparatorBuilder());
    const customPrefix = (0, exports.getCustomIdPrefix)(client);
    if (menuType === 'main') {
        const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`${customPrefix}:np:font_menu:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setLabel('Choose Font')
            .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
            .setCustomId(`${customPrefix}:np:style_menu:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setLabel('Choose Text Effect')
            .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
            .setCustomId(`${customPrefix}:np:color_menu:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setLabel('Choose Colour')
            .setStyle(discord_js_1.ButtonStyle.Primary), new discord_js_1.ButtonBuilder()
            .setCustomId(`${customPrefix}:np:save:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setLabel('Save')
            .setEmoji(emojis_1.default.general.tick)
            .setStyle(discord_js_1.ButtonStyle.Success), new discord_js_1.ButtonBuilder()
            .setCustomId(`${customPrefix}:np:reset:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setLabel('Reset')
            .setEmoji(emojis_1.default.general.cross)
            .setStyle(discord_js_1.ButtonStyle.Danger));
        containerBuilder.addActionRowComponents(row);
    }
    else if (menuType === 'font') {
        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`${customPrefix}:np:set_font:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setPlaceholder('Select a font...')
            .addOptions(Object.entries(exports.FONTS).map(([id, info]) => ({
            label: info.name,
            value: id,
            description: `Apply the ${info.name} font.`
        })));
        const btnRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`${customPrefix}:np:main:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setLabel('Back')
            .setStyle(discord_js_1.ButtonStyle.Secondary));
        containerBuilder.addActionRowComponents(new discord_js_1.ActionRowBuilder().addComponents(select));
        containerBuilder.addActionRowComponents(btnRow);
    }
    else if (menuType === 'style') {
        const select = new discord_js_1.StringSelectMenuBuilder()
            .setCustomId(`${customPrefix}:np:set_style:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setPlaceholder('Select a text effect...')
            .addOptions(Object.entries(exports.EFFECTS).map(([id, info]) => ({
            label: info.name,
            value: id,
            description: info.colorReq
        })));
        const btnRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId(`${customPrefix}:np:main:${fontId}:${effectId}:${colorId}:${callerId}`)
            .setLabel('Back')
            .setStyle(discord_js_1.ButtonStyle.Secondary));
        containerBuilder.addActionRowComponents(new discord_js_1.ActionRowBuilder().addComponents(select));
        containerBuilder.addActionRowComponents(btnRow);
    }
    else if (menuType === 'color') {
        if (effectId === 2) {
            const selectOptions1 = [
                ...Object.entries(exports.COLORS).map(([id, info]) => ({
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
                ...Object.entries(exports.COLORS).map(([id, info]) => ({
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
                .setCustomId(`${customPrefix}:np:set_color_grad1:${fontId}:${effectId}:${colorId}:${callerId}`)
                .setPlaceholder('Select First Gradient Color...')
                .addOptions(selectOptions1);
            const select2 = new discord_js_1.StringSelectMenuBuilder()
                .setCustomId(`${customPrefix}:np:set_color_grad2:${fontId}:${effectId}:${colorId}:${callerId}`)
                .setPlaceholder('Select Second Gradient Color...')
                .addOptions(selectOptions2);
            const btnRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId(`${customPrefix}:np:main:${fontId}:${effectId}:${colorId}:${callerId}`)
                .setLabel('Back')
                .setStyle(discord_js_1.ButtonStyle.Secondary));
            containerBuilder.addActionRowComponents(new discord_js_1.ActionRowBuilder().addComponents(select1));
            containerBuilder.addActionRowComponents(new discord_js_1.ActionRowBuilder().addComponents(select2));
            containerBuilder.addActionRowComponents(btnRow);
        }
        else {
            const selectOptions = [
                ...Object.entries(exports.COLORS).map(([id, info]) => ({
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
                .setCustomId(`${customPrefix}:np:set_color:${fontId}:${effectId}:${colorId}:${callerId}`)
                .setPlaceholder('Select a color theme...')
                .addOptions(selectOptions);
            const btnRow = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId(`${customPrefix}:np:main:${fontId}:${effectId}:${colorId}:${callerId}`)
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
        .setName('bnameplate')
        .setDescription('Change the bot\'s display nameplate style in this server (Premium Only).')
        .setDefaultMemberPermissions(discord_js_1.PermissionsBitField.Flags.Administrator),
    category: 'premium',
    aliases: ['bnameplate', 'bstyle'],
    async prefixExecute(client, message, args) {
        if (!message.member?.permissions.has(discord_js_1.PermissionsBitField.Flags.Administrator) && message.author.id !== message.guild?.ownerId) {
            return message.reply((0, containers_1.cv2)((0, containers_1.container)('You must be a Server Administrator or Owner to use this.', { title: 'Missing Permissions', color: 'error' })));
        }
        await this.handleAction(client, message);
    },
    async execute(interaction, client) {
        await this.handleAction(client, interaction);
    },
    async handleAction(client, context) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        const authorId = isInteraction ? context.user.id : context.author.id;
        const isPremium = await client.db.premiumUser.findUnique({ where: { userId: authorId } });
        const ownerIds = process.env.OWNER_ID?.split(',').map((id) => id.trim()) || [];
        if (!isPremium && !ownerIds.includes(authorId)) {
            return reply((0, containers_1.cv2)((0, containers_1.container)('This command is exclusively for Premium Users.', { title: `${client.user.username} Premium`, color: 'error' })));
        }
        const guildConfig = await client.db.guildConfig.findUnique({
            where: { guildId: context.guildId }
        });
        const fontId = guildConfig?.nameplateFontId ?? 11;
        const effectId = guildConfig?.nameplateEffectId ?? 1;
        const colorsString = guildConfig?.nameplateColors ?? "16777215";
        const hexString = guildConfig?.nameplateHex ?? "#FFFFFF";
        const decimals = colorsString.split(',').map(d => parseInt(d));
        let colorId = 9;
        let foundMatch = false;
        for (const [idStr, info] of Object.entries(exports.COLORS)) {
            const id = parseInt(idStr);
            if (info.colors.length === decimals.length && info.colors.every((val, index) => val === decimals[index])) {
                colorId = id;
                foundMatch = true;
                break;
            }
        }
        if (!foundMatch) {
            colorId = 999;
            if (!client.nameplateCache) {
                client.nameplateCache = new Map();
            }
            const hexColors = hexString.split(',');
            client.nameplateCache.set(`${context.guildId}-${authorId}`, {
                hexColors,
                decColors: decimals
            });
        }
        const ui = await buildNameplateUI(client, fontId, effectId, colorId, authorId, 'main', context.guild?.id);
        await reply((0, containers_1.cv2)(ui));
    }
};
