import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  ComponentType,
  EmbedBuilder,
  SlashCommandBuilder,
  ButtonInteraction,
  Colors,
} from "discord.js";
import { CustomCommand } from "../../models/command";
import { fetchCats } from "../../scraper";
import { Cat, parseAgeToYears } from "../../models/cat";

const getCatEmbed = (cat: Cat, index: number, total: number): EmbedBuilder => {
  return new EmbedBuilder()
    .setTitle(cat.name)
    .setDescription(
      `**Breed:** ${cat.breed}\n**Age:** ${cat.age} years\n**Gender:** ${cat.gender}\n\n**Description**:\n${cat.description}\n`
    )
    .setURL(cat.url)
    .setImage(cat.pfp)
    .setFooter({ text: `Cat ${index + 1} of ${total}` })
    .setColor(Colors.Fuchsia)
    .setTimestamp();
};

export const handleCatViewer = async (
  interaction: ChatInputCommandInteraction,
  cats: Cat[]
): Promise<void> => {
  let currentIndex = 0;

  // Create navigation buttons
  const getButtonRow = (index: number) => {
    return new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("prev_cat")
        .setLabel("Previous")
        .setEmoji("⬅️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === 0),
      new ButtonBuilder()
        .setCustomId("next_cat")
        .setLabel("Next")
        .setEmoji("➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(index === cats.length - 1)
    );
  };

  // Initial embed and buttons
  const initialEmbed = getCatEmbed(
    cats[currentIndex],
    currentIndex,
    cats.length
  );

  const message = await interaction.editReply({
    embeds: [initialEmbed],
    components: [getButtonRow(currentIndex)],
  });

  const collector =
    message.createMessageComponentCollector<ComponentType.Button>({
      time: 300_000, // 5 minute timeout
    });

  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    // Defer the update to avoid interaction timeouts
    await buttonInteraction.deferUpdate();

    switch (buttonInteraction.customId) {
      case "next_cat":
        currentIndex = Math.min(currentIndex + 1, cats.length - 1);
        break;
      case "prev_cat":
        currentIndex = Math.max(currentIndex - 1, 0);
        break;
    }

    const newEmbed = getCatEmbed(cats[currentIndex], currentIndex, cats.length);

    await interaction.editReply({
      embeds: [newEmbed],
      components: [getButtonRow(currentIndex)],
    });
  });

  // Handle collector end event (timeout)
  collector.on("end", async (collected) => {
    // Disable all buttons when the collector ends
    const disabledRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("prev_cat")
        .setLabel("Previous")
        .setEmoji("⬅️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("next_cat")
        .setLabel("Next")
        .setEmoji("➡️")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );

    try {
      await interaction.editReply({
        components: [disabledRow],
      });
    } catch (error) {
      // Ignore errors that might occur if the message is deleted
      console.error("Failed to disable buttons:", error);
    }
  });
};

export const cats: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("cats")
    .setDescription(
      "Find adoptable cats from Toronto Humane Society under 4 years old"
    )
    .addIntegerOption((option) =>
      option
        .setName("max_age")
        .setDescription("Maximum age of cats in years")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(20)
    ),

  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    await interaction.deferReply();

    try {
      // Show a loading message
      await interaction.editReply("🔍 Searching...");

      // Get the maximum age from options, default to 4 if not provided
      const maxAge = interaction.options.getInteger("max_age") || 4;

      // Fetch and process cats
      const rawCats = await fetchCats();
      const cats = rawCats
        .map(
          (rawCat) => ({ ...rawCat, age: parseAgeToYears(rawCat.age) } as Cat)
        )
        .filter((cat) => cat.age < maxAge);

      // Handle no cats found
      if (cats.length === 0) {
        interaction.editReply({
          content: `No cats under ${maxAge} years found. Try increasing the maximum age or try again later.`,
          embeds: [],
          components: [],
        });
      } else {
        interaction.editReply(`Found ${cats.length}...`);
        await handleCatViewer(interaction, cats);
      }
    } catch (error) {
      console.error("Error in cats command:", error);
      await interaction.editReply({
        content:
          "❌ Something went wrong while fetching cats. Please try again later.",
        embeds: [],
        components: [],
      });
    }
  },
};

export default cats;
