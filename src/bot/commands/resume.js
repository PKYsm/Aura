'use strict';
const { SlashCommandBuilder } = require('discord.js');
const playerManager = require('../../audio/player/playerManager');
const { buildContainer } = require('../../ui/builders/containerBuilder');

module.exports = {
  data: new SlashCommandBuilder().setName('resume').setDescription('Resume playback'),

  async execute(interaction) {
    const ok = await playerManager.resume(interaction.guildId);

    return interaction.reply(
      buildContainer({
        title: ok ? 'Aura — Resumed' : 'Aura — Nothing to resume',
        description: ok ? 'Playback has resumed.' : 'There is no active session to resume.',
      })
    );
  },
};
