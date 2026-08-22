"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const gifs = [
    'https://media.giphy.com/media/lrr9cScdxK0j6/giphy.gif',
    'https://media.giphy.com/media/od5H3PmEG5BGq/giphy.gif',
    'https://media.giphy.com/media/wnsgren9NtITS/giphy.gif'
];
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('hug')
        .setDescription('Give someone a warm hug!')
        .addUserOption(o => o.setName('user').setDescription('The user to hug').setRequired(true)),
    aliases: ['hug'],
    category: 'fun',
    async prefixExecute(client, message, args) {
        const target = message.mentions.users.first();
        if (!target) {
            return message.reply((0, containers_1.cv2)((0, containers_1.error)('You need to mention someone to hug!')));
        }
        await this.handleAction(message, message.author, target);
    },
    async execute(interaction, client) {
        const target = interaction.options.getUser('user', true);
        await this.handleAction(interaction, interaction.user, target);
    },
    async handleAction(context, author, target) {
        const isInteraction = !!context.isCommand;
        const reply = (content) => isInteraction ? context.reply(content) : context.reply(content);
        if (author.id === target.id) {
            return reply((0, containers_1.cv2)((0, containers_1.error)('You cannot hug yourself, but we send you virtual hugs! 🫂')));
        }
        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
        const container = new discord_js_1.ContainerBuilder()
            .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`> **<@${author.id}> hugs <@${target.id}>! Awww... ❤️**`))
            .addMediaGalleryComponents(new discord_js_1.MediaGalleryBuilder().addItems(new discord_js_1.MediaGalleryItemBuilder().setURL(randomGif)));
        await reply({
            components: [container],
            flags: discord_js_1.MessageFlags.IsComponentsV2
        });
    }
};
