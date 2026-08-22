"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inSameVoiceChannel = inSameVoiceChannel;
exports.isUserInVoice = isUserInVoice;
function inSameVoiceChannel(interaction) {
    const member = interaction.member;
    const botMember = interaction.guild?.members.cache.get(interaction.client.user.id);
    if (!member.voice.channel) {
        return false;
    }
    if (botMember?.voice.channel && member.voice.channel.id !== botMember.voice.channel.id) {
        return false;
    }
    return true;
}
function isUserInVoice(interaction) {
    const member = interaction.member;
    return !!member.voice.channel;
}
