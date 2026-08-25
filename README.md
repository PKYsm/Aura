# Aura 🎵

A modern, multi-source Discord music bot built on **Shoukaku** + **Lavalink**.

- **Developer:** RasaVedic
- **Email:** RasaVedic@Gmail.com
- **GitHub:** [PKYsm](https://github.com/PKYsm)

## Features

- Multi-source search (Spotify, Deezer, JioSaavn, Apple Music, Gaana, YT Music) — **YouTube is never the default**
- `Play`, `Skip`, `Prev`, `Pause`, `Resume`, `History` slash commands
- Custom chalk-powered structured logger (commands, components, audio lifecycle)
- 3-layer cache/database: In-memory Map (L1) → Upstash Redis (L2) → `db.json` (L3)
- All messages use **Components V2 Containers** with a consistent **Bright Pink (`#FF1493`)** theme
- Auto-silent notifications between **22:00–06:00 IST**, timezone-safe via `Intl`

## Setup

```bash
npm install
cp .env.example .env
# fill in DISCORD_TOKEN, CLIENT_ID, LAVALINK_URL, LAVALINK_PASSWORD, UPSTASH_REDIS_URL
npm start
```

## Project Structure

```
Aura/
├── src/
│   ├── bot/           # client, commands, components, events, handlers
│   ├── audio/         # Shoukaku engine + player/queue/history manager
│   ├── database/       # L1/L2/L3 cache layers + models
│   ├── ui/             # Container V2 builders + Bright Pink theme
│   ├── logger/          # chalk-based structured logger
│   ├── utils/           # IST silent-window helper, etc.
│   └── config/          # central bot config
├── packages/            # reserved for internal shared modules
├── logs/                 # per-category log files
├── data/                 # db.json (L3 persistent store)
├── package.json
├── .env
└── index.js
```

## Notes

- Requires a running Lavalink node with the multi-source plugin(s) enabled (LavaSrc, etc.).
- `DEFAULT_SEARCH_ENGINE` in `.env` controls the search prefix (`spsearch`, `dzsearch`, `jssearch`, `amsearch`, `gnsearch`, `ytmsearch`). Direct URLs bypass this and resolve as-is.
