const { SlashCommandBuilder } = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("ping")
		.setDescription("反応速度を返します"),
	async execute(interaction) {
		await interaction.reply(`WebSocket Ping: ${interaction.client.ws.ping}ms\nAPI Endpoint Ping: 測定結果待ち`);
		const msg = await interaction.fetchReply();
		await interaction.editReply(`WebSocket Ping: ${interaction.client.ws.ping}ms\nAPI Endpoint Ping: ${msg.createdTimestamp - interaction.createdTimestamp}ms`);
	}
}