"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const containers_1 = require("../ui/containers");
const logger_1 = require("../utils/logger");
exports.default = {
    name: discord_js_1.Events.InteractionCreate,
    async execute(interaction, client) {
        try {
            const blacklisted = await client.db.blacklist.findUnique({ where: { userId: interaction.user.id } });
            if (blacklisted)
                return;
        }
        catch { }
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command)
                return;
            try {
                const optsStr = interaction.options.data.map(o => `${o.name}:${o.value}`).join(' ');
                const rawInput = `/${interaction.commandName}${optsStr ? ' ' + optsStr : ''}`;
                logger_1.Logger.logCommand(interaction.user, interaction.guild, interaction.commandName, 'Slash', rawInput);
                await command.execute(interaction, client);
            }
            catch (err) {
                console.error(err);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp((0, containers_1.ephemeralCV2)((0, containers_1.error)('There was an error while executing this command!')));
                }
                else {
                    await interaction.reply((0, containers_1.ephemeralCV2)((0, containers_1.error)('There was an error while executing this command!')));
                }
            }
        }
        else if (interaction.isButton()) {
            await client.componentHandler.handleButton(interaction);
        }
        else if (interaction.isStringSelectMenu()) {
            await client.componentHandler.handleSelectMenu(interaction);
        }
        else if (interaction.isModalSubmit()) {
            await client.componentHandler.handleModalSubmit(interaction);
        }
    }
};
