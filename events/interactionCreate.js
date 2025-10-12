const { Events, MessageFlags } = require('discord.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`${interaction.commandName}に一致するコマンドが見つかりませんでした`);
				return;
			}

			try {
				await command.execute(interaction);
			} catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content: 'コマンドの実行中にエラーが起きました', flags: MessageFlags.ephemeral });
				} else {
					await interaction.reply({ content: 'コマンドの実行中にエラーが起きました', flags: MessageFlags.ephemeral });
				}
			}
		}
	}
}