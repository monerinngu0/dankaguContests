const { Events, MessageFlags, ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");

const fs = require("node:fs");
const path = require("node:path");

const UtilityDB = require("../utilityDB");

const Database = require("better-sqlite3");
const dbPath = path.resolve(__dirname, "../db/contests.db");
const db = new Database(dbPath);
// テーブルがない場合作成
db.prepare(`
  CREATE TABLE IF NOT EXISTS contests (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )
`).run();

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isChatInputCommand()) return;

		if (!interaction.message?.embeds[0]?.footer?.text) return;
		const embedFooter = interaction.message.embeds[0].footer.text;
		const shape = embedFooter.split(/\//); // [a-z]/{id}

		const contestId = shape[1];

		const contestDB = new UtilityDB(contestId);

		let contest = contestDB.load(); // 通常は上で指定したidのオブジェクトを返す

		if (contest == -1) {
           	await interaction.reply({ content: "存在しない大会です。", flags: MessageFlags.Ephemeral });
           	return;
       	}

		if (interaction.isButton()) {
			if (shape[0] == 'c') {
				switch (interaction.customId) {
					case "gachi": contest = await onJoinButton(interaction, contest, contestId, "gachi"); break;
					case "enjoi": contest = await onJoinButton(interaction, contest, contestId, "enjoi"); break;
					case "leave": contest = await onLeaveButton(interaction, contest, contestId); break;
					case "config": await onConfigButton(interaction, contest, contestId); break;

				}
			} else if (shape[0] == 'm') {
				switch (interaction.customId) {
					case "start": await onStartButton(interaction, contest, contestId); break;
					case "delete": await onDeleteButton(interaction, contest, contestId); break;
					case "info": await onInfoButton(interaction, contest, contestId); break;
				}
			} else if (shape[0] == 'n') {
				switch (interaction.customId) {
					case "gachi": await onInformation(interaction, contest, contestId, "gachi"); break;
					case "enjoi": await onInformation(interaction, contest, contestId, "enjoi"); break;
					case "isStart": {

					}; break;
					case "isDelete": {
						contestDB.delete(contestId);
						await interaction.reply({ content: "正常に削除されました。", flags: MessageFlags.Ephemeral });
					}; break;
				}
			} else if (shape[0] === 'p') {
				if (interaction.customId.startsWith("leave:")) {
					const playerId = interaction.customId.split(/:/)[1];
					contest = await onLeaveButton(interaction, contest, contestId, playerId);
				}
			}
		} else if (interaction.isStringSelectMenu()) {
			if (shape[0] == 'o') {
				switch (interaction.customId) {
					case "gachi": await selectPlayer(interaction, contest, contestId, "gachi"); break;
					case "enjoi": await selectPlayer(interaction, contest, contestId, "enjoi"); break;
				}
			}
		}

		contestDB.save(contest); return;
	}
}

// shape[0] == 'c'
async function onJoinButton(interaction, contest, contestId, type) {
	const typeName = type == "gachi" ? "ガチ" : "エンジョイ";
	const opposedType = type == "gachi" ? "enjoi" : "gachi";

	if (contest.isActive) {
		await interaction.reply({ content: "大会開催中です。", flags: MessageFlags.Ephemeral });
		return contest;
	}

	if (contest[type].includes(interaction.user.id)) {
		await interaction.reply({ content: `既に${typeName}部門で参加中です。`, flags: MessageFlags.Ephemeral });
		return contest;
	}

	const newContest = contest[opposedType].filter(id => id != interaction.user.id);
	contest[opposedType] = newContest;

	contest[type].push(interaction.user.id);

	await interaction.reply({content: `${typeName}部門に参加登録しました。`, flags: MessageFlags.Ephemeral });

	return contest;
}

async function onLeaveButton(interaction, contest, contestId, playerId = -1) {
	const leavePlayerId = playerId == -1 ? interaction.user.id : playerId;

	const playerData = await interaction.client.users.fetch(leavePlayerId).catch(() => null);

	// このエラー発生しない
	if (playerData == null) {
		console.log(`プレイヤーid: ${leavePlayerId} は存在しません。`);
	}

	const playerName = playerData.username;

	if (contest.isActive) {
		await interaction.reply({ content: "大会開催中です。", flags: MessageFlags.Ephemeral });
		return;
	}

	const newGachiContest = [];
	for (let i = 0; i < contest["gachi"].length; i++) {
		if (contest["gachi"][i] != leavePlayerId) {
			newGachiContest.push(contest["gachi"][i]);
		}
	}

	const newEnjoiContest = [];
	for (let i = 0; i < contest["enjoi"].length; i++) {
		if (contest["enjoi"][i] != leavePlayerId) {
			newEnjoiContest.push(contest["enjoi"][i]);
		}
	}

	if (contest["gachi"].length != newGachiContest.length) {
		await interaction.reply({ content: `${playerName}をガチ部門から除外しました。`, flags: MessageFlags.Ephemeral });
	} else if (contest["enjoi"].length != newEnjoiContest.length) {
		await interaction.reply({ content: `${playerName}をエンジョイ部門から除外しました。`, flags: MessageFlags.Ephemeral });
	} else {
		await interaction.reply({ content: `${playerName}は${contestId}大会に参加していません。`, flags: MessageFlags.Ephemeral });
	}

	contest["gachi"] = newGachiContest;
	contest["enjoi"] = newEnjoiContest;

	return contest;
}

async function onConfigButton(interaction, contest, contestId) {
	if (!contest.admin.includes(interaction.user.id)) {
		await interaction.reply({ content: "権限がありません。", flags: MessageFlags.Ephemeral })
		return;
	}

	if (!contest.isActive) {
		const embed = new EmbedBuilder()
			.setColor(0x007FFF)
			.setTitle("大会設定")
			.setFooter({ text: `m/${contestId}` });
						
		const startButton = new ButtonBuilder()
			.setCustomId("start")
			.setLabel("開始")
			.setStyle(ButtonStyle.Primary);

		const deleteButton = new ButtonBuilder()
			.setCustomId("delete")
			.setLabel("削除")
			.setStyle(ButtonStyle.Danger);

		const infoButton = new ButtonBuilder()
			.setCustomId("info")
			.setLabel("情報")
			.setStyle(ButtonStyle.Success);

		const actionRow = new ActionRowBuilder()
			.addComponents(startButton, deleteButton, infoButton);

		await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
							
	} else {
		// 大会中の設定
	}
}
// shape[0] == 'm'
async function onStartButton(interaction, contest, contestId) {
	const embed = new EmbedBuilder()
		.setColor(0x007FFF)
		.setTitle("本当に大会を開始しますか？")
		.setFooter({ text: `n/${contestId}` });

	const startButton = new ButtonBuilder()
		.setCustomId("isStart")
		.setLabel("開始")
		.setStyle(ButtonStyle.Primary);
					
	const actionRow = new ActionRowBuilder()
		.addComponents(startButton);
					
	await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
}

async function onDeleteButton(interaction, contest, contestId) {
	const embed = new EmbedBuilder()
		.setColor(0x007FFF)
		.setTitle("本当に大会を削除しますか？")
		.setFooter({ text: `n/${contestId}` });

	const deleteButton = new ButtonBuilder()
		.setCustomId("isDelete")
		.setLabel("削除")
		.setStyle(ButtonStyle.Danger);
					
	const actionRow = new ActionRowBuilder()
		.addComponents(deleteButton);
					
	await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
}

async function onInfoButton(interaction, contest, contestId) {
	const embed = new EmbedBuilder()
		.setColor(0x007FFF)
		.setTitle("大会情報")
		.setFooter({ text: `n/${contestId}` });
					
	const gachiButton = new ButtonBuilder()
		.setCustomId("gachi")
		.setLabel("ガチ参加者")
		.setStyle(ButtonStyle.Secondary);

	const enjoiButton = new ButtonBuilder()
		.setCustomId("enjoi")
		.setLabel("エンジョイ参加者")
		.setStyle(ButtonStyle.Secondary);
					
	const actionRow = new ActionRowBuilder()
		.addComponents(gachiButton, enjoiButton);

	await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
}
// shape[0] == 'n'
async function onInformation(interaction, contest, contestId, type) {
	const typeName = type == "gachi" ? "ガチ" : "エンジョイ";

	if (contest[type].length == 0) {
		await interaction.reply({ content: `${typeName}部門の参加者が存在しません。`, flags: MessageFlags.Ephemeral });
		return;
	}

	let playerDatas = [];

	for (const id of contest[type]) {
		const memberExists = await interaction.guild.members.fetch(id, { force: false }).catch(() => null);

		if (memberExists == null) {
			playerDatas.push([id, null]);
			continue;
		}

		const user = await interaction.client.users.fetch(id).catch(() => null);

		if (user == null) {
			playerDatas.push([id, null]);
			console.log(`プレイヤーid: ${id} は存在しません。(このエラー発生しない)`);
			continue;
		}

		playerDatas.push([id, user.displayName]);
	}

	playerDatas = playerDatas.filter(([id, name]) => name != null);

	const excludedPlayerDatas = playerDatas.map(([id]) => id);
	contest[type] = contest[type].filter(id => !excludedPlayerDatas.includes(id));

	const embed = new EmbedBuilder()
		.setColor(0x007FFF)
		.setTitle(`${typeName}部門参加者`)
		.setDescription(playerDatas.map(([id, name], i) => `**${i+1}.** ${name}`).join('\n'))
		.setFooter({text: `o/${contestId}` });
					
	const playersMenu = new StringSelectMenuBuilder()
		.setCustomId(type)
		.setPlaceholder("プレイヤーを選択してください。")
		.setOptions(
			playerDatas.map(data => 
				new StringSelectMenuOptionBuilder()
					.setLabel(data[1])
					.setValue(data[0])
			)
		);
					
	const actionRow = new ActionRowBuilder()
		.addComponents(playersMenu);
					
	await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
}

async function selectPlayer(interaction, contest, contestId, type) {
	const typeName = type == "gachi" ? "ガチ" : "エンジョイ";

	const playerId = interaction.values[0];

	const playerData = await interaction.client.users.fetch(playerId).catch(() => null);

	// このエラー発生しない
	if (playerData == null) {
		console.log(`プレイヤーid: ${playerId} は存在しません。`);
	}

	const embed = new EmbedBuilder()
		.setColor(0x007FFF)
		.setTitle("参加者情報")
		.setAuthor({ name: playerData.username, iconURL: playerData.displayAvatarURL({ size: 1024, extension: "png" }) })
		.setDescription(`id: ${playerId}`)
		.addFields(
			{ name: "部門", value: typeName },
		)
		.setFooter({text: `p/${contestId}` });

	const leaveButton = new ButtonBuilder()
		.setCustomId(`leave:${playerId}`)
		.setLabel("削除")
		.setStyle(ButtonStyle.Danger);

	const actionRow = new ActionRowBuilder()
		.addComponents(leaveButton);
	
	await interaction.reply({ embeds: [embed], components: [actionRow], flags: MessageFlags.Ephemeral });
}