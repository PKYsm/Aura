'use strict';
const { SlashCommandBuilder } = require('discord.js');
const playerManager = require('../../audio/player/playerManager');
const { buildContainer } = require('../../ui/builders/containerBuilder');

module.exports = {
  data: new SlashCommandBuilder().setName('skip').setDescription('Skip the current track'),

  async execute(interaction) {
    const session = playerManager.getSession(interaction.guildId);

    if (!session || !session.playing) {
      return interaction.reply(
        buildContainer({ title: 'Aura — Nothing playing', description: 'There is no active track to skip.' })
      );
    }

    const next = await playerManager.skip(interaction.guildId);

    return interaction.reply(
      buildContainer({
        title: 'Aura — Skipped',
        description: next ? `Now playing **${next.info.title}**` : 'Queue is now empty.',
      })
    );
  },
};
