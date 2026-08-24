"use strict";

/**
 * ─── Nightly Auto-Backup System ───────────────────────────────────────────────
 *
 * Runs a cron job every night at 12:00 AM (midnight UTC) that:
 *   1. Creates a timestamped, safe copy of data/db.json → data/backups/
 *   2. Sends the file as a Discord attachment to the Admin's DM
 *   3. If the file exceeds Discord's 25 MB limit, gzip-compresses it first
 *   4. If even gzipped it's > 25 MB, sends a text alert with VPS file path
 *   5. Keeps only the last 7 local backups (older ones are auto-deleted)
 *   6. Alerts the admin on failure so they're never silently left without a backup
 *
 * Usage (in bot.js, after Discord login):
 *   const { startBackupCron } = require('./utils/backup');
 *   startBackupCron(client);
 *
 * Required env var:
 *   OWNER_ID        — Already in your .env. If multiple owners (comma-separated), backup DM goes to the first one.
 *   BACKUP_TIMEZONE — (optional) timezone string, e.g. "Asia/Kolkata". Defaults to "UTC"
 *   BACKUP_KEEP     — (optional) number of local backups to retain. Defaults to 7
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');
const cron = require('node-cron');
const { AttachmentBuilder } = require('discord.js');

const gzipAsync = promisify(zlib.gzip);

// ─── Paths ────────────────────────────────────────────────────────────────────

const DB_FILE    = path.join(process.cwd(), 'data', 'db.json');
const BACKUP_DIR = path.join(process.cwd(), 'data', 'backups');

// ─── Constants ────────────────────────────────────────────────────────────────

// Discord's hard attachment limit for bots (25 MB for standard guilds).
// If your server has Boost Level 2+, the limit is 50 MB — adjust if needed.
const DISCORD_LIMIT_BYTES = 25 * 1024 * 1024; // 25 MB

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}

function humanSize(bytes) {
    if (bytes < 1024)              return `${bytes} B`;
    if (bytes < 1024 * 1024)      return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Creates a timestamped, safe copy of db.json in data/backups/.
 * Uses read-then-write (not fs.copyFileSync) so the backup goes through
 * the same validation as any other file open — if db.json is corrupt JSON,
 * we catch it here rather than copying garbage.
 *
 * @returns {string} Absolute path of the newly created backup file.
 */
async function createBackup() {
    ensureBackupDir();

    if (!fs.existsSync(DB_FILE)) {
        throw new Error(`Source database not found at: ${DB_FILE}`);
    }

    // Validate JSON before copying — no point backing up a corrupt file
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    JSON.parse(raw); // throws if corrupt

    const timestamp  = new Date().toISOString().replace(/[:.]/g, '-'); // safe for filenames
    const backupPath = path.join(BACKUP_DIR, `db-backup-${timestamp}.json`);

    fs.writeFileSync(backupPath, raw, 'utf-8');

    return backupPath;
}

/**
 * Deletes old backup files, keeping only the `keepCount` most recent ones.
 * Prevents the backups/ folder from growing unbounded on a long-running VPS.
 *
 * @param {number} keepCount - Number of backups to retain (default: 7)
 */
function pruneOldBackups(keepCount = 7) {
    if (!fs.existsSync(BACKUP_DIR)) return;

    const files = fs
        .readdirSync(BACKUP_DIR)
        .filter((f) => f.startsWith('db-backup-') && (f.endsWith('.json') || f.endsWith('.json.gz')))
        .map((f) => {
            const full = path.join(BACKUP_DIR, f);
            return { name: f, full, mtime: fs.statSync(full).mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime); // newest first

    const toDelete = files.slice(keepCount);
    for (const file of toDelete) {
        try {
            fs.unlinkSync(file.full);
            console.log(`[Backup] 🗑️  Pruned old backup: ${file.name}`);
        } catch (e) {
            console.warn(`[Backup] Could not delete old backup ${file.name}:`, e.message);
        }
    }
}

/**
 * Sends the backup file to the admin's Discord DM.
 *
 * Size handling:
 *   ≤ 25 MB raw   → attach directly as .json
 *   ≤ 25 MB gzipped → gzip first, attach as .json.gz
 *   > 25 MB gzipped → send a text alert with the VPS path + manual instructions
 *
 * @param {import('discord.js').Client} client    - Discord.js Client instance
 * @param {string}                      backupPath - Absolute path to the backup .json file
 */
async function sendBackupToAdmin(client, backupPath) {
    // OWNER_ID may be comma-separated (e.g. "123,456") — send backup to the first (primary) owner.
    const adminId = process.env.OWNER_ID?.split(',')[0]?.trim();
    if (!adminId) {
        console.error('[Backup] ❌ OWNER_ID env var not set — cannot send backup DM. Backup is saved locally.');
        return;
    }

    const rawSize    = fs.statSync(backupPath).size;
    const timestamp  = new Date().toUTCString();
    let   adminUser;

    try {
        adminUser = await client.users.fetch(adminId);
    } catch (e) {
        console.error(`[Backup] ❌ Could not fetch admin user (ID: ${adminId}):`, e.message);
        return;
    }

    // ── Case 1: Raw JSON is within the Discord limit ─────────────────────────
    if (rawSize <= DISCORD_LIMIT_BYTES) {
        const attachment = new AttachmentBuilder(backupPath, { name: path.basename(backupPath) });
        await adminUser.send({
            content: [
                `## 🗄️ Nightly Database Backup`,
                `**Date:**  \`${timestamp}\``,
                `**File:**  \`${path.basename(backupPath)}\``,
                `**Size:**  \`${humanSize(rawSize)}\``,
                `**Tier:**  Raw JSON (no compression needed)`,
            ].join('\n'),
            files: [attachment],
        });
        console.log(`[Backup] ✅ Raw backup sent to admin DM (${humanSize(rawSize)}).`);
        return;
    }

    // ── Case 2: Raw is too large — try gzip ──────────────────────────────────
    console.warn(`[Backup] ⚠️  db.json is ${humanSize(rawSize)} — exceeds 25 MB limit. Compressing...`);

    const rawBuffer = fs.readFileSync(backupPath);
    const gzBuffer  = await gzipAsync(rawBuffer);

    if (gzBuffer.length <= DISCORD_LIMIT_BYTES) {
        // Save gzipped file temporarily, send it, then clean up
        const gzPath     = backupPath + '.gz';
        const gzName     = path.basename(gzPath);
        const savedRatio = (100 - (gzBuffer.length / rawSize) * 100).toFixed(1);

        fs.writeFileSync(gzPath, gzBuffer);

        try {
            const attachment = new AttachmentBuilder(gzPath, { name: gzName });
            await adminUser.send({
                content: [
                    `## 🗄️ Nightly Database Backup`,
                    `**Date:**     \`${timestamp}\``,
                    `**File:**     \`${gzName}\``,
                    `**Raw size:** \`${humanSize(rawSize)}\`  →  **Compressed:** \`${humanSize(gzBuffer.length)}\` (${savedRatio}% smaller)`,
                    `**Tier:**     Gzip compressed (.json.gz)`,
                    `-# To extract: \`gunzip ${gzName}\``,
                ].join('\n'),
                files: [attachment],
            });
            console.log(`[Backup] ✅ Gzipped backup sent to admin DM (${humanSize(gzBuffer.length)}).`);
        } finally {
            // Always clean up the temporary .gz from disk — the .json is the kept copy
            try { fs.unlinkSync(gzPath); } catch {}
        }
        return;
    }

    // ── Case 3: Even gzipped is > 25 MB — send text alert ───────────────────
    console.error(
        `[Backup] ❌ Backup exceeds 25 MB even after gzip (${humanSize(gzBuffer.length)}).` +
        ` File is saved locally at: ${backupPath}`
    );

    await adminUser.send({
        content: [
            `## ⚠️ Nightly Backup — File Too Large to Attach`,
            `**Date:**          \`${timestamp}\``,
            `**Raw size:**      \`${humanSize(rawSize)}\``,
            `**Gzipped size:**  \`${humanSize(gzBuffer.length)}\``,
            `Both exceed Discord's **25 MB** attachment limit.`,
            ``,
            `**📁 File is saved on your VPS at:**`,
            `\`\`\`\n${backupPath}\n\`\`\``,
            `**💡 Manual retrieval options:**`,
            `\`\`\`bash`,
            `# Option 1 — SCP to your local machine`,
            `scp user@your-vps-ip:${backupPath} ./db-backup.json`,
            ``,
            `# Option 2 — Rsync (better for large files, resumable)`,
            `rsync -avz --progress user@your-vps-ip:${backupPath} ./db-backup.json`,
            ``,
            `# Option 3 — Split into 10 MB chunks, then reassemble`,
            `split -b 10m ${backupPath} db-part-`,
            `cat db-part-* > db-backup.json`,
            `\`\`\``,
            `-# Consider migrating to a PostgreSQL / SQLite DB or S3-compatible storage if your database regularly exceeds 25 MB.`,
        ].join('\n'),
    });
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Registers the nightly backup cron job.
 * Must be called AFTER the Discord client has logged in (client.user must exist).
 *
 * Cron schedule: `0 0 * * *` = every day at 00:00 (midnight)
 * Timezone: controlled by BACKUP_TIMEZONE env var (default: "UTC")
 *
 * @param {import('discord.js').Client} client - The logged-in AuraClient instance
 */
function startBackupCron(client) {
    const timezone = process.env.BACKUP_TIMEZONE || 'UTC';
    const keepCount= parseInt(process.env.BACKUP_KEEP || '7', 10);

    // Validate that node-cron supports the timezone
    if (!cron.validate('0 0 * * *')) {
        console.error('[Backup] ❌ Invalid cron expression — backup cron not started.');
        return;
    }

    cron.schedule('0 0 * * *', async () => {
        const startTime = Date.now();
        console.log(`[Backup] 🕛 Nightly backup triggered (${new Date().toUTCString()})`);

        try {
            // Step 1: Create the backup file
            const backupPath = await createBackup();
            const elapsed    = Date.now() - startTime;
            console.log(`[Backup] 📁 Backup created: ${path.basename(backupPath)} (${elapsed}ms)`);

            // Step 2: Send to admin DM
            await sendBackupToAdmin(client, backupPath);

            // Step 3: Clean up old backups
            pruneOldBackups(keepCount);

        } catch (err) {
            console.error('[Backup] ❌ Backup job failed:', err);

            // Best-effort: notify the admin about the failure
            try {
                const adminId = process.env.OWNER_ID?.split(',')[0]?.trim();
                if (adminId) {
                    const adminUser = await client.users.fetch(adminId);
                    await adminUser.send(
                        `## ❌ Nightly Backup Failed\n` +
                        `**Time:** \`${new Date().toUTCString()}\`\n` +
                        `**Error:**\n\`\`\`\n${err.message}\n\`\`\`\n` +
                        `-# Check your VPS logs for more details.`
                    );
                }
            } catch (notifyErr) {
                console.error('[Backup] ❌ Could not notify admin of backup failure:', notifyErr.message);
            }
        }
    }, { timezone });

    console.log(`[Backup] ✅ Nightly backup cron scheduled — runs at 00:00 ${timezone} (keeping last ${keepCount} backups).`);
}

/**
 * Runs a backup immediately on demand (e.g. for owner !backup command).
 * Same logic as the cron but callable manually.
 *
 * @param {import('discord.js').Client} client
 */
async function runBackupNow(client) {
    console.log('[Backup] 🔧 Manual backup triggered.');
    const backupPath = await createBackup();
    await sendBackupToAdmin(client, backupPath);
    pruneOldBackups(parseInt(process.env.BACKUP_KEEP || '7', 10));
    return backupPath;
}

module.exports = { startBackupCron, runBackupNow };
