const { SlashCommandBuilder, MessageFlags, EmbedBuilder } = require("discord.js");
const UtilityDB = require("../../utilityDB")

const allowedUsers = ["1152859332757692447"];

module.exports = {
	data: new SlashCommandBuilder()
		.setName("list")
		.setDescription("すべての大会情報を取得(admin専用)"),
	async execute(interaction) {
        if (!allowedUsers.includes(interaction.user.id)) {
            await interaction.reply({ content: "あなたには権限がありません。", flags: MessageFlags.Ephemeral }); // Ephemeral
            return;
        }

		const contests = UtilityDB.all();

        if (contests.length === 0) {
            await interaction.reply({ content: "現在大会は存在しません。", flags: MessageFlags.Ephemeral });
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("大会一覧")
            .setColor(0x007FFF)
            .setDescription(
                contests.map(c => {
                    const status = c.data.isActive ? "開催中" : "募集中";
                    const gachiCount = c.data.gachi.length;
                    const enjoiCount = c.data.enjoi.length;
                    return `**ID:** ${c.id} | **状態:** ${status} | **ガチ:** ${gachiCount}人 | **エンジョイ:** ${enjoiCount}人`;
                }).join('\n')
            );
        
        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
	}
}