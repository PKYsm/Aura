"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setVoiceChannelStatus = setVoiceChannelStatus;
exports.clearVoiceChannelStatus = clearVoiceChannelStatus;
async function setVoiceChannelStatus(client, channelId, statusText) {
    try {
        await client.rest.put(`/channels/${channelId}/voice-status`, {
            body: {
                status: statusText.substring(0, 500) // Discord limit is 500 characters
            }
        });
    }
    catch (err) {
        // Ignore permissions or missing channel errors
    }
}
async function clearVoiceChannelStatus(client, channelId) {
    try {
        await client.rest.put(`/channels/${channelId}/voice-status`, {
            body: {
                status: ''
            }
        });
    }
    catch (err) {
        // Ignore errors
    }
}
