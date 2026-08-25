'use strict';
const playerManager = require('../../audio/player/playerManager');
const { buildContainer } = require('../../ui/builders/containerBuilder');

/**
 * Handles the "aura_skip" / "aura_pause" / "aura_resume" button customIds
 * that can be attached to the Now Playing container.
 */
module.exports = {
  customId: 'aura_skip',

  async execute(interaction) {
    const next = await playerManager.skip(interaction.guildId);

    return interaction.update(
      buildContainer({
        title: 'Aura — Skipped',
        description: next ? `Now playing **${next.info.title}**` : 'Queue is now empty.',
      })
    );
  },
};
