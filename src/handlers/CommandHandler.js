"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandHandler = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const discord_js_1 = require("discord.js");
class CommandHandler {
    client;
    constructor(client) {
        this.client = client;
    }
    async load() {
        this.client.commands.clear();
        this.client.aliases.clear();
        const commandsPath = (0, path_1.join)(__dirname, '../commands');
        const categories = (0, fs_1.readdirSync)(commandsPath);
        let count = 0;
        for (const category of categories) {
            const categoryPath = (0, path_1.join)(commandsPath, category);
            const files = (0, fs_1.readdirSync)(categoryPath).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
            for (const file of files) {
                const req = require((0, path_1.join)(categoryPath, file));
                const command = req.default || req.command;
                if (command) {
                    if (!command.data && command.name) {
                        command.data = new discord_js_1.SlashCommandBuilder()
                            .setName(command.name)
                            .setDescription(command.description || 'No description provided');
                        if (command.options) {
                            command.options.forEach((opt) => {
                                if (opt.type === discord_js_1.ApplicationCommandOptionType.User) {
                                    command.data.addUserOption((o) => o.setName(opt.name).setDescription(opt.description).setRequired(opt.required || false));
                                }
                                else if (opt.type === discord_js_1.ApplicationCommandOptionType.String) {
                                    command.data.addStringOption((o) => {
                                        o.setName(opt.name).setDescription(opt.description).setRequired(opt.required || false);
                                        if (opt.choices) {
                                            o.addChoices(...opt.choices);
                                        }
                                        return o;
                                    });
                                }
                                else if (opt.type === discord_js_1.ApplicationCommandOptionType.Integer) {
                                    command.data.addIntegerOption((o) => o.setName(opt.name).setDescription(opt.description).setRequired(opt.required || false));
                                }
                            });
                        }
                    }
                    if (command.data && command.execute) {
                        this.client.commands.set(command.data.name, command);
                        if (command.aliases && Array.isArray(command.aliases)) {
                            command.aliases.forEach((alias) => {
                                this.client.aliases.set(alias, command.data.name);
                            });
                        }
                        count++;
                    }
                }
            }
        }
        return `Loaded ${count} commands across ${categories.length} categories.`;
    }
}
exports.CommandHandler = CommandHandler;
