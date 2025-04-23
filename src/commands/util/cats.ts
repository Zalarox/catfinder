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

/**
 * Creates an embed for displaying cat information
 */
const getCatEmbed = (cat: Cat, index: number, total: number): EmbedBuilder => {
  return new EmbedBuilder()
    .setTitle(cat.name)
    .setDescription(
      `**Breed:** ${cat.breed}\n**Age:** ${cat.age} years\n**Gender:** ${cat.gender}\n`
    )
    .setURL(cat.url)
    .setImage(cat.pfp)
    .setFooter({ text: `Cat ${index + 1} of ${total}` })
    .setColor(Colors.Fuchsia)
    .setTimestamp();
};

/**
 * Handles the interactive cat viewer with pagination
 */
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
        .setDisabled(index === cats.length - 1),
      new ButtonBuilder()
        .setCustomId("refresh_cats")
        .setLabel("Refresh")
        .setEmoji("🔄")
        .setStyle(ButtonStyle.Success)
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

  // Create a collector that listens for button interactions
  const collector =
    message.createMessageComponentCollector<ComponentType.Button>({
      time: 300_000, // 5 minute timeout
      filter: (i) => i.user.id === interaction.user.id, // Only listen to command invoker
    });

  // Handle button interactions
  collector.on("collect", async (buttonInteraction: ButtonInteraction) => {
    // Defer the update to avoid interaction timeouts
    await buttonInteraction.deferUpdate();

    // Handle different button actions
    switch (buttonInteraction.customId) {
      case "next_cat":
        currentIndex = Math.min(currentIndex + 1, cats.length - 1);
        break;
      case "prev_cat":
        currentIndex = Math.max(currentIndex - 1, 0);
        break;
      case "refresh_cats":
        // Refresh logic - can be expanded to re-fetch cats if needed
        // For now just refreshes the current view
        break;
    }

    // Update the message with new content
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
        .setDisabled(true),
      new ButtonBuilder()
        .setCustomId("refresh_cats")
        .setLabel("Refresh")
        .setEmoji("🔄")
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

/**
 * The cats command implementation
 */
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
      await interaction.editReply(
        "🔍 Searching for adoptable cats... Please wait!"
      );

      // Get the maximum age from options, default to 4 if not provided
      const maxAge = interaction.options.getInteger("max_age") || 4;

      // Fetch and process cats
      const rawCats = await fetchCats();
      const cats = rawCats
        .map(
          (rawCat) => ({ ...rawCat, age: parseAgeToYears(rawCat.age) } as Cat)
        )
        .filter((cat) => cat.age < maxAge)
        .sort((a, b) => a.age - b.age); // Sort by age, youngest first

      // Handle no cats found
      if (cats.length === 0) {
        interaction.editReply({
          content: `No cats under ${maxAge} years found. Try increasing the maximum age or try again later.`,
          embeds: [],
          components: [],
        });
      }

      // Start the interactive cat viewer
      await handleCatViewer(interaction, cats);
    } catch (error) {
      console.error("Error in cats command:", error);

      // Provide a user-friendly error message
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
