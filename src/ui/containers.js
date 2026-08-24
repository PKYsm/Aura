"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.THEME_COLOR = void 0;
exports.container = container;
exports.containerWithDivider = containerWithDivider;
exports.success = success;
exports.error = error;
exports.premiumOnly = premiumOnly;
exports.sectionWithThumb = sectionWithThumb;
exports.layoutView = layoutView;
exports.ephemeralCV2 = ephemeralCV2;
exports.cv2 = cv2;
const discord_js_1 = require("discord.js");
const emojis_1 = __importDefault(require("../utils/emojis"));
// Accent colors give a Components V2 container the colored side-bar look of a
// classic embed (ContainerBuilder.setAccentColor), without leaving V2.
exports.THEME_COLOR = 0xAD00FF;
const ACCENT_COLORS = {
    default: exports.THEME_COLOR,
    success: 0x57F287,
    error: 0xF04747,
    premium: 0xF1C40F,
    warning: 0xFAA61A,
};
function container(content, options) {
    const c = new discord_js_1.ContainerBuilder();
    c.setAccentColor(ACCENT_COLORS[options?.color || 'default']);
    let prefix = '';
    if (options?.color === 'error') {
        prefix = `${emojis_1.default.general.cross} `;
    }
    else if (options?.color === 'success') {
        prefix = `${emojis_1.default.general.tick} `;
    }
    if (prefix && options?.title) {
        c.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`# ${prefix}${options.title}`));
        c.addSeparatorComponents(new discord_js_1.SeparatorBuilder());
        const contentTexts = [new discord_js_1.TextDisplayBuilder().setContent(content)];
        if (options?.footer) {
            contentTexts.push(new discord_js_1.TextDisplayBuilder().setContent(`-# ${options.footer}`));
        }
        if (options?.thumbnail) {
            const section = new discord_js_1.SectionBuilder()
                .addTextDisplayComponents(...contentTexts)
                .setThumbnailAccessory(new discord_js_1.ThumbnailBuilder().setURL(options.thumbnail));
            c.addSectionComponents(section);
        }
        else {
            c.addTextDisplayComponents(...contentTexts);
        }
    }
    else {
        const texts = [];
        if (options?.title) {
            texts.push(new discord_js_1.TextDisplayBuilder().setContent(`# ${options.title}`));
        }
        const contentText = prefix ? `${prefix}${content}` : content;
        texts.push(new discord_js_1.TextDisplayBuilder().setContent(contentText));
        if (options?.footer) {
            texts.push(new discord_js_1.TextDisplayBuilder().setContent(`-# ${options.footer}`));
        }
        if (options?.thumbnail) {
            const section = new discord_js_1.SectionBuilder()
                .addTextDisplayComponents(...texts)
                .setThumbnailAccessory(new discord_js_1.ThumbnailBuilder().setURL(options.thumbnail));
            c.addSectionComponents(section);
        }
        else {
            c.addTextDisplayComponents(...texts);
        }
    }
    return c;
}
/** Like container(), but takes multiple text blocks and puts a native divider line
 *  between each consecutive pair — for when you need an actual separator, not just
 *  a blank line, between two pieces of content. */
function containerWithDivider(blocks, options) {
    const c = new discord_js_1.ContainerBuilder();
    c.setAccentColor(ACCENT_COLORS[options?.color || 'default']);
    blocks.forEach((block, i) => {
        if (i > 0) {
            c.addSeparatorComponents(new discord_js_1.SeparatorBuilder());
        }
        c.addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(block));
    });
    return c;
}
function success(text) {
    return container(text, { color: 'success', title: 'Success' });
}
function error(text) {
    return container(text, { color: 'error', title: 'Error' });
}
function premiumOnly(featureName) {
    return container(`This feature (\`${featureName}\`) requires a higher Premium Tier.`, {
        color: 'premium',
        title: 'Premium Only'
    });
}
function sectionWithThumb(title, desc, thumbnailUrl) {
    return new discord_js_1.SectionBuilder()
        .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`**${title}**`), new discord_js_1.TextDisplayBuilder().setContent(desc))
        .setThumbnailAccessory(new discord_js_1.ThumbnailBuilder().setURL(thumbnailUrl));
}
function layoutView(...containers) {
    return containers;
}
function ephemeralCV2(containerBuilder) {
    return {
        components: Array.isArray(containerBuilder) ? containerBuilder : [containerBuilder],
        flags: discord_js_1.MessageFlags.IsComponentsV2 | discord_js_1.MessageFlags.Ephemeral
    };
}
function cv2(containerBuilder) {
    return {
        components: Array.isArray(containerBuilder) ? containerBuilder : [containerBuilder],
        flags: discord_js_1.MessageFlags.IsComponentsV2
    };
}
