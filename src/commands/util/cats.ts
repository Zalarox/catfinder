import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  CommandInteraction,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
} from "discord.js";
import { CustomCommand } from "../../models/command";
import { fetchCats } from "../../scraper";
import { Cat, parseAgeToYears } from "../../models/cat";

const getCatEmbed = (cat: Cat, index: number, total: number): EmbedBuilder =>
  new EmbedBuilder()
    .setTitle(cat.name)
    .setDescription(
      `**Breed:** ${cat.breed}\n**Age:** ${cat.age} years\n**Gender:** ${cat.gender}\n`
    )
    .setURL(cat.url)
    .setImage(cat.pfp)
    .setFooter({ text: `Cat ${index + 1} of ${total}` })
    .setColor(0xffc0cb);

export const handleCatViewer = async (
  interaction: CommandInteraction<CacheType>,
  cats: Cat[]
) => {
  let i = 0;

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("prev_cat")
      .setLabel("⬅️ Previous")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true),

    new ButtonBuilder()
      .setCustomId("next_cat")
      .setLabel("Next ➡️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(cats.length <= 1)
  );

  const initialEmbed = getCatEmbed(cats[i], i, cats.length);
  const message = await interaction.editReply({
    embeds: [initialEmbed],
    components: [row],
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60_000, // 1 minute timeout
  });

  collector.on("collect", async (buttonInteraction) => {
    if (buttonInteraction.user.id !== interaction.user.id) {
      return buttonInteraction.reply({
        content: "You're not allowed to use these buttons.",
        ephemeral: true,
      });
    }

    await buttonInteraction.deferUpdate();

    if (buttonInteraction.customId === "next_cat") {
      i = (i + 1) % cats.length;
    } else if (buttonInteraction.customId === "prev_cat") {
      i = (i - 1 + cats.length) % cats.length;
    }

    const newEmbed = getCatEmbed(cats[i], i, cats.length);

    // Update buttons
    row.components[0].setDisabled(i === 0);
    row.components[1].setDisabled(i === cats.length - 1);

    await interaction.editReply({
      embeds: [newEmbed],
      components: [row],
    });
  });

  collector.on("end", async () => {
    // Disable buttons after timeout
    row.components.forEach((button) => button.setDisabled(true));
    await interaction.editReply({
      components: [row],
    });
  });
};

export const cats: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("cats")
    .setDescription(
      "Check for cats on THS under the age of 4 years and not currently on hold."
    ),
  execute: async (interaction) => {
    await interaction.deferReply();
    const rawCats = await fetchCats();
    const cats = rawCats
      .map((rawCat) => ({ ...rawCat, age: parseAgeToYears(rawCat.age) } as Cat))
      .filter((x) => x.age < 4);

    if (cats.length === 0) {
      interaction.editReply("No cats found matching the criteria.");
    }

    await handleCatViewer(interaction, cats);
  },
};

export default cats;
