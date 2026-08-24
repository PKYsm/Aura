"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuraClient = void 0;
const discord_js_1 = require("discord.js");
const kazagumo_1 = require("kazagumo");
const shoukaku_1 = require("shoukaku");
const jsondb_1 = require("./utils/jsondb");
const redisCache_1 = require("./utils/redisCache");
const node_cache_1 = __importDefault(require("node-cache"));
const chalk_1 = __importDefault(require("chalk"));
const gradient_string_1 = __importDefault(require("gradient-string"));
require("dotenv/config");
const logger_1 = require("./utils/logger");
const CommandHandler_1 = require("./handlers/CommandHandler");
const EventHandler_1 = require("./handlers/EventHandler");
const ComponentHandler_1 = require("./handlers/ComponentHandler");
const MusicHandler_1 = require("./handlers/MusicHandler");
class AuraClient extends discord_js_1.Client {
    commands = new discord_js_1.Collection();
    aliases = new discord_js_1.Collection();
    db = new jsondb_1.JsonDatabase();
    cache = new node_cache_1.default({ stdTTL: 60, checkperiod: 120, maxKeys: 1000 });
    music;
    guildPlayers = new discord_js_1.Collection();
    lyricSyncSessions = new discord_js_1.Collection(); // guildId -> Collection(messageId -> { intervalId, cacheKey, trackKey, channelId })
    commandHandler = new CommandHandler_1.CommandHandler(this);
    eventHandler = new EventHandler_1.EventHandler(this);
    componentHandler = new ComponentHandler_1.ComponentHandler(this);
    musicHandler = new MusicHandler_1.MusicHandler(this);
    constructor() {
        super({
            intents: [
                discord_js_1.GatewayIntentBits.Guilds,
                discord_js_1.GatewayIntentBits.GuildMessages,
                discord_js_1.GatewayIntentBits.MessageContent,
                discord_js_1.GatewayIntentBits.GuildVoiceStates,
            ],
            makeCache: discord_js_1.Options.cacheWithLimits({
                MessageManager: 10,
                StageInstanceManager: 0,
                PresenceManager: 0,
                ReactionManager: 0,
                ThreadManager: 0,
                ThreadMemberManager: 0,
                GuildBanManager: 0,
                GuildInviteManager: 0,
                GuildStickerManager: 0,
                GuildScheduledEventManager: 0,
                AutoModerationRuleManager: 0,
            }),
            sweepers: {
                messages: {
                    interval: 300,
                    lifetime: 600,
                },
            },
            allowedMentions: { repliedUser: false },
        });
    }
    async start() {
        process.on('unhandledRejection', (reason) => {
            console.error('[Unhandled Rejection]', reason);
        });
        process.on('uncaughtException', (error) => {
            console.error('[Uncaught Exception]', error);
        });
        const isMasterShard = !this.shard || this.shard.ids[0] === 0;
        const themeGradient = (0, gradient_string_1.default)('#FF00D9', '#00E7FF', '#AD00FF');
        const cyberGradient = (0, gradient_string_1.default)('#00FF7F', '#00E7FF');
        if (isMasterShard) {
            console.clear();
            process.stdout.write('\x1B[2J\x1B[3J\x1B[H');
            const asciiArt = `
      ███████╗███████╗██████╗  ██████╗ ██╗  ██╗
      ██╔════╝██╔════╝██╔══██╗██╔═══██╗╚██╗██╔╝
      █████╗  █████╗  ██████╔╝██║   ██║ ╚███╔╝ 
      ██╔══╝  ██╔══╝  ██╔══██╗██║   ██║ ██╔██╗ 
      ██║     ███████╗██║  ██║╚██████╔╝██╔╝ ██╗
      ╚═╝     ╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝
      `;
            console.log(themeGradient.multiline(asciiArt));
            console.log(chalk_1.default.gray('      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
            console.log(`      ${themeGradient('» SYSTEM STATUS «')}`);
            console.log(`      ${chalk_1.default.gray('•')} ${chalk_1.default.whiteBright('Node.js:')} ${chalk_1.default.cyan(process.version)}`);
            console.log(`      ${chalk_1.default.gray('•')} ${chalk_1.default.whiteBright('Platform:')} ${chalk_1.default.cyan(process.platform)}`);
            console.log(`      ${chalk_1.default.gray('•')} ${chalk_1.default.whiteBright('Memory:')} ${chalk_1.default.cyan((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB')}`);
            console.log(chalk_1.default.gray('      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        }
        const animate = async (text, action) => {
            if (!isMasterShard) {
                await action();
                return;
            }
            const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
            let i = 0;
            const interval = setInterval(() => {
                const frame = themeGradient(frames[i = ++i % frames.length]);
                process.stdout.write(`\r      ${frame} ${chalk_1.default.gray(text)}`);
            }, 80);
            try {
                const res = await action();
                clearInterval(interval);
                process.stdout.write(`\r      ${chalk_1.default.hex('#00FF7F')('✔')} ${cyberGradient(res || text)}${' '.repeat(20)}\n`);
            }
            catch (e) {
                clearInterval(interval);
                process.stdout.write(`\r      ${chalk_1.default.hex('#FF003C')('✖')} ${chalk_1.default.red(text)}${' '.repeat(20)}\n`);
                throw e;
            }
        };
        await animate('Initializing Database...', async () => {
            await this.db.$connect();
            return 'Local JSON Database Ready';
        });
        await animate('Connecting Redis Cache...', async () => {
            const redis = (0, redisCache_1.getRedis)();
            if (!redis) return 'Redis skipped (env vars not set)';
            // Dedicated RAM cache for DB hot-path models (separate from client.cache which
            // is used for lyrics sessions).  5-minute TTL, checked every 60 seconds.
            const dbRamCache = new node_cache_1.default({ stdTTL: 300, checkperiod: 60 });
            this.db.useRedis(redis, dbRamCache);
            return 'Redis L2 Cache Active (RAM → Redis → DB)';
        });
        await animate('Indexing Commands...', async () => {
            const res = await this.commandHandler.load();
            return res;
        });
        await animate('Booting Music Engine...', async () => {
            this.initMusic();
            return 'Lavalink Clusters Active';
        });
        await animate('Binding Event Listeners...', async () => {
            const res = await this.eventHandler.load();
            return res;
        });
        await animate('Readying Component Routes...', async () => {
            const res = await this.componentHandler.load();
            return res;
        });
        await animate('Authenticating with Discord...', async () => {
            await this.login(process.env.BOT_TOKEN);
            return `Authorized as ${this.user?.tag}`;
        });
        if (isMasterShard) {
            setInterval(async () => {
                try {
                    const now = new Date();
                    const expiredPremium = await this.db.premiumUser.findMany({ where: { expiresAt: { lt: now } } });
                    const expiredNP = await this.db.noPrefixUser.findMany({ where: { expiresAt: { lt: now } } });
                    for (const user of expiredPremium) {
                        await this.db.premiumUser.delete({ where: { userId: user.userId } });
                        const targetUser = await this.users.fetch(user.userId).catch(() => null);
                        if (targetUser)
                            logger_1.Logger.logPremium('Expired', targetUser, 'Premium access automatically expired.');
                    }
                    for (const user of expiredNP) {
                        await this.db.noPrefixUser.delete({ where: { userId: user.userId } });
                        const targetUser = await this.users.fetch(user.userId).catch(() => null);
                        if (targetUser)
                            logger_1.Logger.logNP('Expired', targetUser, 'No-Prefix access automatically expired.');
                    }
                }
                catch (e) {
                    console.error('[Expiry Task Error]', e);
                }
            }, 60 * 60 * 1000);
            console.log(chalk_1.default.gray('      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
            console.log(`      ${themeGradient('» Aura Music is now Online and Ready «')}`);
            console.log(chalk_1.default.gray('      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
        }
    }
    initMusic() {
        const Nodes = [{
                name: process.env.LAVALINK_NAME || 'AuraNode',
                url: process.env.LAVALINK_HOST || process.env.LAVALINK_URL || 'localhost:2333',
                auth: process.env.LAVALINK_PASSWORD || process.env.LAVALINK_AUTH || 'youshallnotpass',
                secure: process.env.LAVALINK_SECURE === 'true'
            }];
        this.music = new kazagumo_1.Kazagumo({
            defaultSearchEngine: 'spsearch',
            // No plugins registered: this Lavalink node natively resolves spsearch/dzsearch/jssearch/scsearch
            // via its own source plugin, so we pass the raw prefix straight through instead of letting a
            // client-side plugin intercept and re-route everything through YouTube Music.
            plugins: [],
            send: (guildId, payload) => {
                const guild = this.guilds.cache.get(guildId);
                if (guild)
                    guild.shard.send(payload);
            }
        }, new shoukaku_1.Connectors.DiscordJS(this), Nodes, {
            // Auto-retry a disconnected Lavalink node: up to 5 attempts total, ~15s apart
            // (so 3 attempts land inside the first minute), then Shoukaku gives up and
            // emits 'disconnect' — handled/logged in MusicHandler.
            reconnectTries: parseInt(process.env.LAVALINK_RECONNECT_TRIES || '5', 10),
            reconnectInterval: parseInt(process.env.LAVALINK_RECONNECT_INTERVAL || '15000', 10)
        });
        this.musicHandler.load();
    }
}
exports.AuraClient = AuraClient;
const client = new AuraClient();
client.start().catch((error) => {
    console.error(chalk_1.default.red('\n[FATAL ERROR] Bot failed to start:'), error);
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    console.error(chalk_1.default.red('\n[Unhandled Rejection]'), reason);
    logger_1.Logger.logError(reason instanceof Error ? reason : new Error(String(reason)), 'Unhandled Rejection');
});
process.on('uncaughtException', (error) => {
    console.error(chalk_1.default.red('\n[Uncaught Exception]'), error);
    logger_1.Logger.logError(error, 'Uncaught Exception');
});
