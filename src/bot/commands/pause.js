'use strict';
const { SlashCommandBuilder } = require('discord.js');
const playerManager = require('../../audio/player/playerManager');
const { buildContainer } = require('../../ui/builders/containerBuilder');

module.exports = {
  data: new SlashCommandBuilder().setName('pause').setDescription('Pause the current track'),

  async execute(interaction) {
    const ok = await playerManager.pause(interaction.guildId);

    return interaction.reply(
      buildContainer({
        title: ok ? 'Aura — Paused' : 'Aura — Nothing to pause',
        description: ok ? 'Playback has been paused.' : 'There is no active session to pause.',
      })
    );
  },
};
