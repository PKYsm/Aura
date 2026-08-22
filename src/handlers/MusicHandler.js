"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicHandler = void 0;
const chalk_1 = __importDefault(require("chalk"));
const logger_1 = require("../utils/logger");

const RECONNECT_TRIES = parseInt(process.env.LAVALINK_RECONNECT_TRIES || '5', 10);
const RECONNECT_INTERVAL_MS = parseInt(process.env.LAVALINK_RECONNECT_INTERVAL || '15000', 10);

class MusicHandler {
    client;
    nodeDown = new Map(); // nodeName -> boolean, tracks whether we've already logged this node as down
    constructor(client) {
        this.client = client;
    }
    load() {
        this.client.music.shoukaku.on('ready', async (name) => {
            if (this.nodeDown.get(name)) {
                this.nodeDown.set(name, false);
                console.log(`${chalk_1.default.bgGreen.black(' LAVALINK ')} ${chalk_1.default.greenBright(`Node "${name}" reconnected successfully.`)}`);
            }
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
        this.client.music.shoukaku.on('error', (name, error) => {
            console.error(`${chalk_1.default.bgRed.white(' LAVALINK ')} ${chalk_1.default.redBright(`Node "${name}" error:`)}`, error);
        });
        this.client.music.shoukaku.on('close', (name, code, reason) => {
            this.nodeDown.set(name, true);
            console.log(`${chalk_1.default.bgYellow.black(' LAVALINK ')} ${chalk_1.default.yellow(`Node "${name}" connection closed`)} ${chalk_1.default.gray(`(code ${code}: ${reason || 'no reason given'})`)}\n` +
                `${' '.repeat(11)}${chalk_1.default.gray('↳ auto-retrying —')} ${chalk_1.default.cyan(`up to ${RECONNECT_TRIES} attempts`)}${chalk_1.default.gray(', ~')}${chalk_1.default.cyan(`${RECONNECT_INTERVAL_MS / 1000}s`)} ${chalk_1.default.gray('apart')}`);
        });
        this.client.music.shoukaku.on('disconnect', (name, count) => {
            const affected = count ? ` ${count} player(s) were affected.` : '';
            console.log(`${chalk_1.default.bgRed.white(' LAVALINK ')} ${chalk_1.default.redBright(`Node "${name}" gave up after ${RECONNECT_TRIES} failed reconnect attempts.`)}${affected ? chalk_1.default.gray(affected) : ''}`);
            logger_1.Logger.logError(new Error(`Lavalink node "${name}" is permanently disconnected after exhausting ${RECONNECT_TRIES} reconnect attempts.${affected}`), 'Lavalink Node Disconnected');
        });
    }
}
exports.MusicHandler = MusicHandler;
