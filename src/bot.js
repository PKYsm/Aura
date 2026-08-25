"use strict";

const { Client, Collection, GatewayIntentBits, Options } = require('discord.js');
const { Kazagumo }          = require('kazagumo');
const { Connectors }        = require('shoukaku');
const { JsonDatabase }      = require('./utils/jsondb');
const { getRedis }          = require('./utils/redisCache');
const { startBackupCron }   = require('./utils/backup');
const NodeCache             = require('node-cache');
const chalk                 = require('chalk');
const gradient              = require('gradient-string');
require('dotenv/config');
const { Logger }            = require('./utils/logger');
const { CommandHandler }    = require('./handlers/CommandHandler');
const { EventHandler }      = require('./handlers/EventHandler');
const { ComponentHandler }  = require('./handlers/ComponentHandler');
const { MusicHandler }      = require('./handlers/MusicHandler');

class AuraClient extends Client {
    commands           = new Collection();
    aliases            = new Collection();
    db                 = new JsonDatabase();
    cache              = new NodeCache({ stdTTL: 120, checkperiod: 60, maxKeys: 1000 }); // 120s — enough for user to pick from search results
    music;
    guildPlayers       = new Collection();
    lyricSyncSessions  = new Collection();
    commandHandler     = new CommandHandler(this);
    eventHandler       = new EventHandler(this);
    componentHandler   = new ComponentHandler(this);
    musicHandler       = new MusicHandler(this);

    constructor() {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates,
            ],
            makeCache: Options.cacheWithLimits({
                MessageManager:            10,
                StageInstanceManager:       0,
                PresenceManager:            0,
                ReactionManager:            0,
                ThreadManager:              0,
                ThreadMemberManager:        0,
                GuildBanManager:            0,
                GuildInviteManager:         0,
                GuildStickerManager:        0,
                GuildScheduledEventManager: 0,
                AutoModerationRuleManager:  0,
            }),
            sweepers: {
                messages: { interval: 300, lifetime: 600 },
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

        const isMasterShard   = !this.shard || this.shard.ids[0] === 0;
        const themeGradient   = gradient('#FF00D9', '#00E7FF', '#AD00FF');
        const cyberGradient   = gradient('#00FF7F', '#00E7FF');

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
            console.log(chalk.gray('      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
            console.log(`      ${themeGradient('» SYSTEM STATUS «')}`);
            console.log(`      ${chalk.gray('•')} ${chalk.whiteBright('Node.js:')}  ${chalk.cyan(process.version)}`);
            console.log(`      ${chalk.gray('•')} ${chalk.whiteBright('Platform:')} ${chalk.cyan(process.platform)}`);
            console.log(`      ${chalk.gray('•')} ${chalk.whiteBright('Memory:')}   ${chalk.cyan((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB')}`);
            console.log(chalk.gray('      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
        }

        // ─── Animated startup helper ──────────────────────────────────────────
        const animate = async (text, action) => {
            if (!isMasterShard) { await action(); return; }
            const frames = ['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
            let i = 0;
            const interval = setInterval(() => {
                const frame = themeGradient(frames[i = ++i % frames.length]);
                process.stdout.write(`\r      ${frame} ${chalk.gray(text)}`);
            }, 80);
            try {
                const res = await action();
                clearInterval(interval);
                process.stdout.write(`\r      ${chalk.hex('#00FF7F')('✔')} ${cyberGradient(res || text)}${' '.repeat(20)}\n`);
            } catch (e) {
                clearInterval(interval);
                process.stdout.write(`\r      ${chalk.hex('#FF003C')('✖')} ${chalk.red(text)}${' '.repeat(20)}\n`);
                throw e;
            }
        };

        // ─── Boot Sequence ────────────────────────────────────────────────────

        await animate('Initializing Database...', async () => {
            await this.db.$connect();
            return 'Local JSON Database Ready (Atomic Writes Active)';
        });

        await animate('Connecting Redis Cache...', async () => {
            const redis = getRedis();
            if (!redis) return 'Redis skipped (env vars not set) — L1+L3 only';

            // Dedicated RAM cache for DB hot-path models (5 min TTL, 60s check).
            // Kept separate from client.cache which is used for lyrics sessions.
            const dbRamCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
            this.db.useRedis(redis, dbRamCache);
            return 'L1 RAM → L2 Redis → L3 JSON  (3-Tier Cache Active)';
        });

        await animate('Indexing Commands...', async () => {
            return this.commandHandler.load();
        });

        await animate('Booting Music Engine...', async () => {
            this.initMusic();
            return 'Lavalink Clusters Active';
        });

        await animate('Binding Event Listeners...', async () => {
            return this.eventHandler.load();
        });

        await animate('Readying Component Routes...', async () => {
            return this.componentHandler.load();
        });

        await animate('Authenticating with Discord...', async () => {
            await this.login(process.env.BOT_TOKEN);
            return `Authorized as ${this.user?.tag}`;
        });

        // ── Nightly Backup Cron ────────────────────────────────────────────────
        // Registered after login so client.users.fetch() is available at midnight.
        // The cron itself fires at 00:00 — the bot is always ready by then.
        await animate('Scheduling Nightly Backup...', async () => {
            startBackupCron(this);
            const tz = process.env.BACKUP_TIMEZONE || 'UTC';
            return `Backup Cron Active — runs at 00:00 ${tz} → Admin DM`;
        });

        // ── Periodic Expiry Task (master shard only) ──────────────────────────
        if (isMasterShard) {
            setInterval(async () => {
                try {
                    const now = new Date();
                    const expiredPremium = await this.db.premiumUser.findMany({ where: { expiresAt: { lt: now } } });
                    const expiredNP      = await this.db.noPrefixUser.findMany({ where: { expiresAt: { lt: now } } });

                    for (const user of expiredPremium) {
                        await this.db.premiumUser.delete({ where: { userId: user.userId } });
                        const u = await this.users.fetch(user.userId).catch(() => null);
                        if (u) Logger.logPremium('Expired', u, 'Premium access automatically expired.');
                    }
                    for (const user of expiredNP) {
                        await this.db.noPrefixUser.delete({ where: { userId: user.userId } });
                        const u = await this.users.fetch(user.userId).catch(() => null);
                        if (u) Logger.logNP('Expired', u, 'No-Prefix access automatically expired.');
                    }
                } catch (e) {
                    console.error('[Expiry Task Error]', e);
                }
            }, 60 * 60 * 1000); // every hour

            console.log(chalk.gray('      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
            console.log(`      ${themeGradient('» Aura Music is now Online and Ready «')}`);
            console.log(chalk.gray('      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
        }
    }

    initMusic() {
        const Nodes = [{
            name:   process.env.LAVALINK_NAME     || 'AuraNode',
            url:    process.env.LAVALINK_HOST      || process.env.LAVALINK_URL || 'localhost:2333',
            auth:   process.env.LAVALINK_PASSWORD  || process.env.LAVALINK_AUTH || 'youshallnotpass',
            secure: process.env.LAVALINK_SECURE    === 'true',
        }];

        this.music = new Kazagumo({
            defaultSearchEngine: 'spsearch',
            plugins: [],
            send: (guildId, payload) => {
                const guild = this.guilds.cache.get(guildId);
                if (guild) guild.shard.send(payload);
            },
        }, new Connectors.DiscordJS(this), Nodes, {
            reconnectTries:    parseInt(process.env.LAVALINK_RECONNECT_TRIES    || '5',     10),
            reconnectInterval: parseInt(process.env.LAVALINK_RECONNECT_INTERVAL || '15000', 10),
        });

        this.musicHandler.load();
    }
}

exports.AuraClient = AuraClient;

const client = new AuraClient();
client.start().catch((error) => {
    console.error(chalk.red('\n[FATAL ERROR] Bot failed to start:'), error);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error(chalk.red('\n[Unhandled Rejection]'), reason);
    Logger.logError(reason instanceof Error ? reason : new Error(String(reason)), 'Unhandled Rejection');
});

process.on('uncaughtException', (error) => {
    console.error(chalk.red('\n[Uncaught Exception]'), error);
    Logger.logError(error, 'Uncaught Exception');
});
