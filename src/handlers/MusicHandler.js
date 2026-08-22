"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicHandler = void 0;
const chalk_1 = __importDefault(require("chalk"));
class MusicHandler {
    client;
    constructor(client) {
        this.client = client;
    }
    load() {
        this.client.music.shoukaku.on('ready', async (name) => {
            try {
                const vcs = await this.client.db.vc247.findMany();
                let reconnected = 0;
                for (const vc of vcs) {
                    const guild = this.client.guilds.cache.get(vc.guildId);
                    if (guild && !this.client.music.players.get(vc.guildId)) {
                        const textId = guild.systemChannelId || guild.channels.cache.filter(c => c.isTextBased()).first()?.id;
                        if (textId) {
                            await this.client.music.createPlayer({
                                guildId: vc.guildId,
                                textId: textId,
                                voiceId: vc.channelId,
                                deaf: true,
                                shardId: guild.shardId
                            });
                            reconnected++;
                        }
                    }
                }
                if (reconnected > 0)
                    console.log(chalk_1.default.green(`[24/7] Reconnected to ${reconnected} voice channels.`));
            }
            catch (e) {
                console.error(chalk_1.default.red('[24/7] Error reconnecting:'), e);
            }
        });
        this.client.music.shoukaku.on('error', (name, error) => console.error(chalk_1.default.red(`[LAVALINK] Node ${name} error:`), error));
        this.client.music.shoukaku.on('close', (name, code, reason) => console.log(chalk_1.default.yellow(`[LAVALINK] Node ${name} closed with code ${code}: ${reason}`)));
        this.client.music.shoukaku.on('disconnect', (name, count) => console.log(chalk_1.default.yellow(`[LAVALINK] Node ${name} disconnected. (count: ${count})`)));
    }
}
exports.MusicHandler = MusicHandler;
