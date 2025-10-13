const { SlashCommandBuilder, MessageFlags, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const UtilityDB = require("../../utilityDB");
const { channel } = require("node:diagnostics_channel");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("open")
		.setDescription("大会の参加者募集")
        .addStringOption(option =>
		    option.setName("contestid")
                .setDescription("contestID")
			    .setRequired(true)
        ),
	async execute(interaction) {
        const contestId = interaction.options.getString("contestid");

        const contestDB = new UtilityDB(contestId);

        if (contestDB.load() != -1) {
            await interaction.reply({ content: "この大会IDは既に使用されています。", flags: MessageFlags.Ephemeral });
            return;
        }

        const contest = {
            "isActive": false,
            "gachi": [],
            "enjoi": [],
            "admin": [interaction.user.id],
            "ids": { "channelId": "", "messageId": "" },
        }

        contestDB.save(contest);

		const descriptionEmbed = new EmbedBuilder()
            .setColor(0x007FFF)
            .setTitle("大会参加")
            .setFooter({ text: `c/${contestId}` });
        
        const gachiButton = new ButtonBuilder()
            .setCustomId("gachi")
            .setLabel("ガチ部門")
            .setStyle(ButtonStyle.Primary);

        const enjoiButton = new ButtonBuilder()
            .setCustomId("enjoi")
            .setLabel("エンジョイ部門")
            .setStyle(ButtonStyle.Success);

        const leaveButton = new ButtonBuilder()
            .setCustomId("leave")
            .setLabel("大会辞退")
            .setStyle(ButtonStyle.Danger);
        
        const configButton = new ButtonBuilder()
            .setCustomId("config")
            .setLabel("管理")
            .setStyle(ButtonStyle.Secondary);

        const actionRow = new ActionRowBuilder()
            .addComponents(gachiButton, enjoiButton, leaveButton, configButton);

        const sent = await interaction.channel.send({ embeds: [descriptionEmbed], components: [actionRow] });
        await interaction.reply({ content: "正常に準備が完了しました。", flags: MessageFlags.Ephemeral });

        contest.ids.channelId = sent.channelId;
        contest.ids.messageId = sent.messageId;
        contestDB.save(contest);
	}
}