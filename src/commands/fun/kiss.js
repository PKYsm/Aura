"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
const gifs = [
    'https://media.giphy.com/media/G3va31oEEnIkM/giphy.gif',
    'https://media.giphy.com/media/FqWAhOooPEnzG/giphy.gif',
    'https://media.giphy.com/media/nyGFcsP0kAobm/giphy.gif'
];
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('kiss')
        .setDescription('Give someone a sweet kiss!')
        .addUserOption(o => o.setName('user').setDescription('The user to kiss').setRequired(true)),
    aliases: ['kiss'],
    category: 'fun',
    async prefixExecute(client, message, args) {
        const target = message.mentions.users.first();
        if (!target) {
            return message.reply((0, containers_1.cv2)((0, containers_1.error)('You need to mention someone to kiss!')));
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
            return reply((0, containers_1.cv2)((0, containers_1.error)('You cannot kiss yourself! 🥺')));
        }
        const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
        const container = new discord_js_1.ContainerBuilder()
            .addTextDisplayComponents(new discord_js_1.TextDisplayBuilder().setContent(`> **<@${author.id}> kisses <@${target.id}>! So romantic... 💋**`))
            .addMediaGalleryComponents(new discord_js_1.MediaGalleryBuilder().addItems(new discord_js_1.MediaGalleryItemBuilder().setURL(randomGif)));
        await reply({
            components: [container],
            flags: discord_js_1.MessageFlags.IsComponentsV2
        });
    }
};
