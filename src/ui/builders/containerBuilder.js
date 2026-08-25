'use strict';
const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');
const colors = require('../themes/colors');
const { isSilentWindowIST } = require('../../utils/silentWindow');

/**
 * Builds a standardized Aura "Container V2" payload.
 *
 * ALL outgoing bot messages should be built through this function so:
 *  - the Bright Pink accent color is applied consistently
 *  - Components V2 flag is always set
 *  - the 22:00–06:00 IST silent window is enforced automatically
 *
 * @param {object} opts
 * @param {string} opts.title            - Heading text (rendered as ### heading)
 * @param {string} [opts.description]    - Body text below a separator
 * @param {string[]} [opts.fields]       - Extra text-display lines
 * @param {ActionRowBuilder[]} [opts.actionRows] - Button rows (e.g. play controls)
 * @returns {{ components: any[], flags: number }}
 */
function buildContainer({ title, description, fields = [], actionRows = [] }) {
  const container = new ContainerBuilder().setAccentColor(colors.PRIMARY);

  container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}`));

  if (description) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    );
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
  }

  for (const field of fields) {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(field));
  }

  for (const row of actionRows) {
    container.addActionRowComponents(row);
  }

  let flags = MessageFlags.IsComponentsV2;
  if (isSilentWindowIST()) {
    flags |= MessageFlags.SuppressNotifications;
  }

  return {
    components: [container],
    flags,
  };
}

module.exports = { buildContainer, ActionRowBuilder };
