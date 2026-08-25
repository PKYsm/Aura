'use strict';
const { SlashCommandBuilder } = require('discord.js');
const { resolveSearchQuery } = require('../../audio/engine/connection');
const playerManager = require('../../audio/player/playerManager');
const { buildContainer } = require('../../ui/builders/containerBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from Spotify, Deezer, JioSaavn, Apple Music & more')
    .addStringOption((opt) =>
      opt.setName('query').setDescription('Song name or URL').setRequired(true)
    ),

  async execute(interaction, { shoukaku }) {
    const query = interaction.options.getString('query', true);
    const voiceChannel = interaction.member.voice?.channel;

    if (!voiceChannel) {
      return interaction.reply(
        buildContainer({
          title: 'Aura — Join a voice channel first',
          description: 'You need to be in a voice channel to use `/play`.',
        })
      );
    }

    await interaction.deferReply();

    const session = await playerManager.createSession(
      shoukaku,
      interaction.guild,
      voiceChannel.id,
      interaction.channelId
    );

    const node = [...shoukaku.nodes.values()][0];
    const searchQuery = resolveSearchQuery(query);
    const result = await node.rest.resolve(searchQuery);

    if (!result || !result.data || (Array.isArray(result.data) && result.data.length === 0)) {
      return interaction.editReply(
        buildContainer({
          title: 'Aura — No results',
          description: `No tracks found for **${query}**.`,
        })
      );
    }

    const track = Array.isArray(result.data) ? result.data[0] : result.data.tracks?.[0];

    if (!session.playing) {
      session.playing = track;
      await session.player.playTrack({ track: { encoded: track.encoded } });
    } else {
      playerManager.enqueue(interaction.guildId, track);
    }

    return interaction.editReply(
      buildContainer({
        title: session.playing === track ? 'Aura — Now Playing' : 'Aura — Added to Queue',
        description: `**${track.info.title}**\nby ${track.info.author}`,
      })
    );
  },
};
