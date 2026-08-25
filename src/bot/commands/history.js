'use strict';
const { SlashCommandBuilder } = require('discord.js');
const historyModel = require('../../database/models/historyModel');
const { buildContainer } = require('../../ui/builders/containerBuilder');

module.exports = {
  data: new SlashCommandBuilder().setName('history').setDescription('Show recently played tracks'),

  async execute(interaction) {
    const history = await historyModel.getHistory(interaction.guildId);

    if (!history.length) {
      return interaction.reply(
        buildContainer({ title: 'Aura — History', description: 'No tracks have been played yet.' })
      );
    }

    const lines = history
      .slice()
      .reverse()
      .slice(0, 10)
      .map((t, i) => `**${i + 1}.** ${t.title} — ${t.author}`);

    return interaction.reply(
      buildContainer({
        title: 'Aura — Recently Played',
        description: lines.join('\n'),
      })
    );
  },
};
