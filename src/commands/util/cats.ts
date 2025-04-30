import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { CustomCommand } from "../../models/command";
import { fetchTCRCats, fetchTHSCats } from "../../scraper";
import {
  Cat,
  handleCatViewer,
  parseAgeToYears,
  ShallowCat,
} from "../../models/cat";

export const cats: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("cats")
    .setDescription("Find adoptable cats from a shelter under 4 years old")
    .addStringOption((option) =>
      option
        .setName("shelter")
        .setDescription("Allows searching between THS and TCR")
        .setRequired(false)
        .addChoices(
          { name: "ths", value: "ths" },
          { name: "tcr", value: "tcr" }
        )
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
      await interaction.editReply("🔍 Searching...");
      const maxAge = interaction.options.getInteger("max_age") || 4;
      const shelter = interaction.options.getString("shelter") || "ths";
      let cats: Cat[] | ShallowCat[] = [];

      if (shelter === "ths") {
        // Fetch and process THS cats
        const rawCats = await fetchTHSCats();
        cats = rawCats
          .map(
            (rawCat) => ({ ...rawCat, age: parseAgeToYears(rawCat.age) } as Cat)
          )
          .filter((cat) => cat.age < maxAge);
      } else {
        // Fetch and process TCR cats
        cats = await fetchTCRCats();
      }

      // Handle no cats found
      if (cats.length === 0) {
        interaction.editReply({
          content: `No cats under ${maxAge} years found. Try increasing the maximum age or try again later.`,
          embeds: [],
          components: [],
        });
      } else {
        interaction.editReply(`Found ${cats.length}...`);

        if (shelter === "ths")
          await handleCatViewer(interaction, cats as Cat[]);
        else
          interaction.editReply(
            `Cats:\n\n${cats
              .map(
                (cat, i) =>
                  `${i}: ${cat.name} - ${cat.breed} [https://www.adoptapet.com/${cat.url}]`
              )
              .join("\n")}`
          );
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
