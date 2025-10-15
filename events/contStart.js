
const { Events, EmbedBuilder, ButtonBuilder } = require('discord.js');

const UtilityDB = require("../utilityDB.js");

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) return;

		if (!interaction.message?.embeds[0]?.footer?.text) return;
		const embedFooter = interaction.message.embeds[0].footer.text;
		const shape = embedFooter.split(/\//); // [a-z]/{id}

		const [scheme, contestId] = shape;

		const contestDB = new UtilityDB(contestId);

		let contest = contestDB.load(); // 通常は上で指定したidのオブジェクトを返す

		if (contest == -1) {
           	await interaction.reply({ content: "存在しない大会です。", flags: MessageFlags.Ephemeral });
           	return;
       	}

        if (interaction.isButton()) {
            if (scheme == 'n' && interaction.customId == "isStart") {
                contest = await onStart(interaction, contest, contestId);
            }
        }

        contestDB.save(contest); return;
    }
}

async function onStart(interaction, contest, contestId) {
    contest.isActive = true;

    const embed = new EmbedBuilder()
        .setColor(0x007FFF)
        .setTitle(contestId)
        .setDescription()
        .setFooter({ text: `m/${contestId}` });
    
    const inputButton = new ButtonBuilder()
        .setCustomId("input");
}