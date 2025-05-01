import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { CustomCommand } from "../../models/command";
import { fetchTCRCats } from "../../scraper";
import { ShallowCat } from "../../models/cat";

const formatCat = (cat: ShallowCat, i: number) =>
  `${i + 1}. [${cat.name}](<https://www.adoptapet.com${cat.url}>) - ${
    cat.breed
  }`;

const splitCatMessages = (cats: ShallowCat[], maxLength = 2000) => {
  const chunks = [];
  let currentChunk = "## Cats:\n\n";
  let indexOffset = 0;

  cats.forEach((cat, i) => {
    const entry = formatCat(cat, i + indexOffset) + "\n";
    if ((currentChunk + entry).length > maxLength) {
      chunks.push(currentChunk.trim());
      currentChunk = "## Cats:\n\n";
      indexOffset = i;
    }
    currentChunk += entry;
  });

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

export const cats: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("tcr")
    .setDescription("Find adoptable babies from shelter")
    .addStringOption((option) =>
      option
        .setName("age")
        .setDescription("Allows searching baby or young")
        .setRequired(false)
        .addChoices(
          { name: "baby", value: "baby" },
          { name: "young", value: "young" }
        )
    ),
  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    await interaction.deferReply();

    try {
      await interaction.editReply("🔍 Searching...");
      const age = interaction.options.getString("age") || "baby";
      let cats: ShallowCat[] = [];
      // Fetch and process TCR cats
      cats = await fetchTCRCats(age);

      // Handle no cats found
      if (cats.length === 0) {
        interaction.editReply({
          content: "No cats found.",
          embeds: [],
          components: [],
        });
      } else {
        const chunks = splitCatMessages(cats);
        await interaction.editReply(chunks[0]);

        for (const chunk of chunks.slice(1)) {
          await interaction.followUp(chunk);
        }
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
