'use strict';
const logger = require('../../logger');
const { buildContainer } = require('../../ui/builders/containerBuilder');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction, ctx) {
    // ── Slash Commands ──────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      logger.command.executed(interaction.commandName, interaction.user, interaction.guild);

      try {
        await command.execute(interaction, ctx);
      } catch (error) {
        logger.command.failed(interaction.commandName, interaction.user, interaction.guild, error);

        const payload = buildContainer({
          title: 'Aura — Something went wrong',
          description: 'That command hit an unexpected error. Please try again.',
        });

        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(payload).catch(() => {});
        } else {
          await interaction.reply(payload).catch(() => {});
        }
      }
      return;
    }

    // ── Buttons / Components ────────────────────────
    if (interaction.isButton()) {
      logger.component.interaction(
        interaction.customId,
        interaction.user,
        interaction.guild,
        interaction.message?.id
      );

      const component = client.components.get(interaction.customId);
      if (!component) return;

      try {
        await component.execute(interaction, ctx);
      } catch (error) {
        logger.system.error('Component execution failed', {
          customId: interaction.customId,
          error: error.message,
        });
      }
    }
  },
};
