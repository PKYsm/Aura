# Aura — Discord Music Bot

Aura is a full-featured Discord music bot: queueing, filters, autoplay, playlists,
Spotify/lyrics lookup, a hybrid (slash + prefix) command system, premium tiers,
and a sharded architecture for scaling across many servers.

Built entirely in **plain JavaScript** (CommonJS) — no TypeScript build step required.

---

## ✨ Features

- 🎵 Slash **and** prefix commands (hybrid command handler)
- 🔊 Lavalink-powered music engine (via Kazagumo/Shoukaku)
- 📃 Queue management, filters, loop modes, autoplay, replay, seek, shuffle
- 💖 Liked songs & playlists (local JSON database, zero external DB required)
- 🎤 `/lyrics` — real-time auto-synced lyrics that track the currently playing song (updates live, ends automatically with the track), or a Full Text mode for reading the whole song; sourced from LRCLIB → lyrics.ovh → Genius; switch modes and pages via dropdowns, or search for any song's lyrics even when nothing is playing
- ⭐ Premium tiers: 24/7 mode, custom bio/banner/nameplate/prefix
- 🛠️ Owner tools: blacklist, admin, restart, hot-reload
- 📋 Detailed logging — every command (user, guild, exact input) and every guild join/leave, printed to a colour-coded console and appended to `logs/*.log`, alongside the existing Discord webhook logging
- 🔁 Lavalink auto-reconnect — a dropped node retries automatically (up to 5 attempts, ~15s apart) before logging a clear failure
- 🧩 Component-driven UI (buttons, menus) with a themed startup console
- 🧵 Sharding out of the box via `discord.js` `ShardingManager`

## 📁 Project Structure

```
aura-music-bot/
├── index.js                  # Root startup file — run this (requires src/index.js)
├── src/
│   ├── index.js              # Sharding manager bootstrap — spawns shards
│   ├── bot.js                 # Client bootstrap (AuraClient)
│   ├── config/
│   │   └── botInfo.js         # Bot & developer metadata (branding, contact links)
│   ├── commands/
│   │   ├── music/             # play, queue, skip, filters, seek, ...
│   │   ├── general/           # info, help, ping, stats, invite, support, ...
│   │   ├── fun/                # hug, kiss, pat, slap, ship
│   │   ├── config/             # per-guild settings (ignore, react, respond)
│   │   ├── premium/            # 24/7, custom bio/banner/nameplate/prefix
│   │   └── owner/              # admin, blacklist, restart, reload, premium mgmt
│   ├── events/                 # ready, guildCreate/Delete, interactionCreate, music/*
│   ├── handlers/               # CommandHandler, EventHandler, ComponentHandler, MusicHandler
│   ├── managers/                # QueueManager, PlayerManager, FilterManager
│   ├── ui/                      # embeds, containers, buttons/menus, help menu
│   ├── utils/                   # logger, local JSON DB, spotify, lyrics, format helpers
│   └── types/                   # shared enums (PremiumTier, LoopMode)
├── data/                        # local JSON database (auto-created at runtime, gitignored)
├── logs/                        # commands.log, guilds.log, errors.log (auto-created at runtime, gitignored)
├── .env.example
├── package.json
└── README.md
```

## 🚀 Setup

### 1. Prerequisites

- Node.js **18+**
- A running [Lavalink](https://github.com/lavalink-devs/Lavalink) server (v4 recommended)
- A Discord bot application ([Discord Developer Portal](https://discord.com/developers/applications))

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `BOT_TOKEN` | Your Discord bot token |
| `OWNER_ID` | Your Discord user ID (grants owner-only commands) |
| `PREFIX` | Default text-command prefix |
| `LAVALINK_HOST` / `LAVALINK_PASSWORD` | Your Lavalink node connection details |
| `LAVALINK_RECONNECT_TRIES` / `LAVALINK_RECONNECT_INTERVAL` | Auto-reconnect tuning if the node drops (defaults: 5 tries, 15000ms apart) |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | For Spotify link resolution |
| `GENIUS_TOKEN` | For the lyrics command |
| `WEBHOOK_*` | Optional Discord webhooks for logging (commands, errors, premium, etc.) |

### 4. Run the bot

```bash
npm start
# or directly:
node index.js
```

For local development with auto-restart on file changes:

```bash
npm run dev
```

## 📋 Logs

Every command execution and every guild join/leave is printed to the console (colour-coded via chalk) and appended to a matching file under `logs/`, which is created automatically on first run:

| File | Contents |
| --- | --- |
| `logs/commands.log` | Every slash/prefix command — user, guild, exact command text typed |
| `logs/guilds.log` | Every guild join/leave — server name, member count, owner |
| `logs/errors.log` | Uncaught errors, unhandled rejections, and Lavalink node failures |

These are separate from (and in addition to) the optional `WEBHOOK_*` Discord logging above — the files work with no webhooks configured at all. `logs/` is gitignored, so log files never get committed; delete or archive them any time without affecting the bot.

## 🧠 Branding & Developer Info

All bot/developer metadata lives in one place — `src/config/botInfo.js` — so you
only ever need to edit it once:

```js
module.exports = {
  botName: 'Aura',
  developer: {
    name: 'RasaVedic',
    email: 'RasaVedic@gmail.com',
    github: 'https://github.com/PKYsm',
    instagram: 'https://instagram.com/Mai.Pankaj.hu',
    whatsapp: 'https://wa.me/qr/Mai.Pankaj',
  },
  links: {
    supportServer: 'https://discord.gg/your-invite-here',
  },
};
```

> ⚠️ Update `links.supportServer` and `developer.whatsapp` with your real invite
> link / WhatsApp link before deploying — placeholders are marked `TODO` in the file.

## 👤 Developer

- **Name:** RasaVedic
- **Email:** RasaVedic@gmail.com
- **GitHub:** [@PKYsm](https://github.com/PKYsm)
- **Instagram:** [@Mai.Pankaj.hu](https://instagram.com/Mai.Pankaj.hu)
- **WhatsApp:** [@Mai.Pankaj](https://wa.me/qr/Mai.Pankaj)

---

## 📄 License

MIT — see `LICENSE`.
