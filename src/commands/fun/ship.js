"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const canvas_1 = require("@napi-rs/canvas");
const path_1 = require("path");
const fs_1 = require("fs");
const emojis_1 = __importDefault(require("../../utils/emojis"));
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('ship')
        .setDescription('Calculate the shipping compatibility between two users!')
        .addUserOption(o => o.setName('user1').setDescription('First user').setRequired(true))
        .addUserOption(o => o.setName('user2').setDescription('Second user (optional)').setRequired(false)),
    category: 'fun',
    aliases: ['ship'],
    async prefixExecute(client, message, args) {
        let user1 = message.mentions.users.first();
        let user2 = message.mentions.users.size > 1 ? Array.from(message.mentions.users.values())[1] : null;
        if (!user1 && args.length > 0) {
            user1 = await client.users.fetch(args[0].replace(/[<@!>]/g, '')).catch(() => null);
        }
        if (!user2 && args.length > 1) {
            user2 = await client.users.fetch(args[1].replace(/[<@!>]/g, '')).catch(() => null);
        }
        if (!user1)
            user1 = message.author;
        if (!user2 && user1) {
            user2 = user1;
            user1 = message.author;
        }
        await this.handleAction(client, message, user1, user2 || message.author);
    },
    async execute(interaction, client) {
        const user1 = interaction.options.getUser('user1', true);
        const user2 = interaction.options.getUser('user2') || interaction.user;
        await this.handleAction(client, interaction, user1, user2);
    },
    async handleAction(client, context, u1, u2) {
        const isInteraction = !!context.isCommand;
        let processingMessage = null;
        if (isInteraction) {
            if (!context.deferred && !context.replied) {
                await context.deferReply();
            }
        }
        else {
            processingMessage = await context.reply(`${emojis_1.default.general.loading} Calculating compatibility...`);
        }
        try {
            const baseImagePath = (0, path_1.join)(process.cwd(), 'assets', 'ship.png');
            if (!(0, fs_1.existsSync)(baseImagePath)) {
                const msg = (0, containers_1.cv2)((0, containers_1.container)('Ship template not found. Please make sure `assets/ship.png` exists.', { title: 'Aura Fun', color: 'error' }));
                if (isInteraction)
                    return context.followUp(msg);
                if (processingMessage)
                    await processingMessage.delete().catch(() => { });
                return context.reply(msg);
            }
            const baseImage = await (0, canvas_1.loadImage)(baseImagePath);
            const canvas = (0, canvas_1.createCanvas)(baseImage.width, baseImage.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(baseImage, 0, 0);
            const av1Url = u1.displayAvatarURL({ extension: 'png', size: 512 });
            const av2Url = u2.displayAvatarURL({ extension: 'png', size: 512 });
            const [av1, av2] = await Promise.all([
                (0, canvas_1.loadImage)(av1Url).catch(() => null),
                (0, canvas_1.loadImage)(av2Url).catch(() => null)
            ]);
            if (!av1 || !av2) {
                const msg = (0, containers_1.cv2)((0, containers_1.container)('Failed to download avatars.', { title: 'Aura Fun', color: 'error' }));
                if (isInteraction)
                    return context.followUp(msg);
                if (processingMessage)
                    await processingMessage.delete().catch(() => { });
                return context.reply(msg);
            }
            const avatarSize = Math.floor(baseImage.height * 0.70);
            const leftX = Math.floor(baseImage.width * 0.20) - (avatarSize / 2);
            const rightX = Math.floor(baseImage.width * 0.80) - (avatarSize / 2);
            const yCenter = Math.floor(baseImage.height * 0.46) - (avatarSize / 2);
            ctx.save();
            ctx.beginPath();
            ctx.arc(leftX + avatarSize / 2, yCenter + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(av1, leftX, yCenter, avatarSize, avatarSize);
            ctx.restore();
            ctx.save();
            ctx.beginPath();
            ctx.arc(rightX + avatarSize / 2, yCenter + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(av2, rightX, yCenter, avatarSize, avatarSize);
            ctx.restore();
            const combinedId = `${u1.id}${u2.id}`;
            let hash = 0;
            for (let i = 0; i < combinedId.length; i++)
                hash = Math.imul(31, hash) + combinedId.charCodeAt(i) | 0;
            const percent = Math.abs(hash) % 101;
            let status = "No Hope";
            if (percent > 90)
                status = "Perfect Match";
            else if (percent > 75)
                status = "True Love";
            else if (percent > 55)
                status = "Great Pair";
            else if (percent > 35)
                status = "Could Work";
            const cx = baseImage.width / 2;
            ctx.fillStyle = '#ff1493';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${Math.floor(baseImage.height * 0.32)}px Arial, sans-serif`;
            ctx.fillText(`${percent}%`, cx, Math.floor(baseImage.height * 0.50));
            ctx.font = `bold ${Math.floor(baseImage.height * 0.12)}px Arial, sans-serif`;
            ctx.fillText(status, cx, Math.floor(baseImage.height * 0.89));
            const attachment = new discord_js_1.AttachmentBuilder(await canvas.encode('png'), { name: 'ship.png' });
            const authorId = context.user?.id || context.author?.id;
            const row = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
                .setCustomId(`AuraX:ship_random:${context.guildId}:${authorId}`)
                .setLabel('🎲 Ship Random')
                .setStyle(discord_js_1.ButtonStyle.Secondary));
            const content = `**${u1.displayName} 💘 ${u2.displayName}**`;
            if (isInteraction) {
                await context.editReply({ content, files: [attachment], components: [row] });
            }
            else {
                if (processingMessage)
                    await processingMessage.delete().catch(() => { });
                await context.reply({ content, files: [attachment], components: [row] });
            }
        }
        catch (e) {
            console.error('Ship command error:', e);
            const msg = (0, containers_1.cv2)((0, containers_1.container)('Something went wrong generating the ship card.', { title: 'Aura Fun', color: 'error' }));
            if (isInteraction) {
                if (context.deferred || context.replied) {
                    await context.editReply(msg).catch(() => { });
                }
                else {
                    await context.reply(msg).catch(() => { });
                }
            }
            else {
                if (processingMessage)
                    await processingMessage.delete().catch(() => { });
                await context.reply(msg).catch(() => { });
            }
        }
    }
};
