import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { CustomCommand } from "../../models/command";
import { fetchTHSCats } from "../../scraper";
import { Cat, handleCatViewer, parseAgeToYears } from "../../models/cat";

export const cats: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("cats")
    .setDescription("Find adoptable cats from a shelter under 4 years old"),
  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    await interaction.deferReply();

    try {
      await interaction.editReply("🔍 Searching...");
      const maxAge = 4;
      let cats: Cat[] = [];

      // Fetch and process THS cats
      const rawCats = await fetchTHSCats();
      cats = rawCats
        .map(
          (rawCat) => ({ ...rawCat, age: parseAgeToYears(rawCat.age) } as Cat)
        )
        .filter((cat) => cat.age < maxAge);

      if (cats.length === 0) {
        interaction.editReply({
          content: "No cats found.",
          embeds: [],
          components: [],
        });
      } else {
        interaction.editReply(`Found ${cats.length} cats. Here they are:`);
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
