"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../../ui/containers");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName('volume')
        .setDescription('Change the volume')
        .addIntegerOption(o => o.setName('amount').setDescription('Volume percentage').setRequired(false)),
    aliases: ['v', 'vol'],
    category: 'music',
    async prefixExecute(client, message, args) {
        const player = client.music.players.get(message.guildId);
        if (!player)
            return message.reply((0, containers_1.cv2)((0, containers_1.error)('Nothing playing.')));
        if (!args[0] || isNaN(parseInt(args[0]))) {
            let prefix = process.env.PREFIX || '$';
            try {
                const gConf = await client.db.guildConfig.findUnique({ where: { guildId: message.guildId } });
                if (gConf && gConf.prefix)
                    prefix = gConf.prefix;
            }
            catch { }
            return message.reply((0, containers_1.cv2)((0, containers_1.error)(`Current volume is **${player.volume}%**.\nTo change it, provide a value (e.g. \`${prefix}volume 100\`).`)));
        }
        const vol = parseInt(args[0]);
        if (vol < 1 || vol > 150) {
            return message.reply((0, containers_1.cv2)((0, containers_1.error)('Volume must be between 1 and 150.')));
        }
        player.setVolume(vol);
        await message.reply((0, containers_1.cv2)((0, containers_1.success)(`Volume set to **${vol}%**`)));
    },
    async execute(interaction, client) {
        const player = client.music.players.get(interaction.guildId);
        if (!player)
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Nothing playing.')));
        const vol = interaction.options.getInteger('amount');
        if (vol === null || isNaN(vol)) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)(`Current volume is **${player.volume}%**.\nTo change it, provide a value (e.g. \`/volume 100\`).`)));
        }
        if (vol < 1 || vol > 150) {
            return interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('Volume must be between 1 and 150.')));
        }
        player.setVolume(vol);
        await interaction.reply((0, containers_1.cv2)((0, containers_1.success)(`Volume set to **${vol}%**`)));
    }
};
