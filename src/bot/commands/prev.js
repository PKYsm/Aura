'use strict';
const { SlashCommandBuilder } = require('discord.js');
const playerManager = require('../../audio/player/playerManager');
const { buildContainer } = require('../../ui/builders/containerBuilder');

module.exports = {
  data: new SlashCommandBuilder().setName('prev').setDescription('Play the previous track'),

  async execute(interaction) {
    const session = playerManager.getSession(interaction.guildId);

    if (!session) {
      return interaction.reply(
        buildContainer({ title: 'Aura — No active session', description: 'Aura is not connected to a voice channel here.' })
      );
    }

    const previous = await playerManager.prev(interaction.guildId);

    if (!previous) {
      return interaction.reply(
        buildContainer({ title: 'Aura — No history', description: 'There is nothing in the history to go back to.' })
      );
    }

    return interaction.reply(
      buildContainer({
        title: 'Aura — Playing Previous',
        description: `**${previous.title}**\nby ${previous.author}`,
      })
    );
  },
};
