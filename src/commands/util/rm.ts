import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { CustomCommand } from "../../models/command";
import { fetchTCRCats, fetchTHSCats } from "../../scraper";
import { extractPetId } from "../../models/cat";
import { BANLIST_PATH } from "../../utils";
import fs from "fs";

const clearBans = () =>
  fs.writeFileSync(BANLIST_PATH, JSON.stringify({ ids: [] }, null, 2));

const banId = (id: string) => {
  if (!fs.existsSync(BANLIST_PATH)) return { ids: [] };
  const raw = fs.readFileSync(BANLIST_PATH, "utf-8");
  const banList = JSON.parse(raw);
  if (!banList.ids.includes(id)) {
    banList.ids.push(id);
    fs.writeFileSync(BANLIST_PATH, JSON.stringify(banList, null, 2));
    return true;
  } else {
    return false;
  }
};

export const rm: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("rm")
    .setDescription("Do not suggest this pet ID anymore")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription(
          "The case-insensitive name to ignore -- uses IDs internally"
        )
    )
    .addBooleanOption((option) =>
      option.setName("clear").setDescription("Clear the ban list")
    ),
  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    await interaction.deferReply();

    try {
      if (interaction.options.getBoolean("clear")) {
        clearBans();
        interaction.editReply("Cleared ban list.");
        return;
      }

      await interaction.editReply("🔍 Searching names...");
      const babyCats = await fetchTCRCats("baby");
      const youngCats = await fetchTCRCats("young");
      const thsCats = await fetchTHSCats();

      const idMap: { [key: string]: string } = {};
      [...babyCats, ...youngCats, ...thsCats].forEach((cat) => {
        idMap[cat.name.toLowerCase()] = extractPetId(cat.url) ?? "";
      });

      const name = interaction.options.getString("name")?.toLowerCase();
      if (!name) throw new Error("Name wasn't populated.");
      if (!idMap[name] || idMap[name] === "") throw new Error("Id not found.");

      const response = banId(idMap[name]);
      if (response)
        interaction.editReply(
          `Banned the ID ${idMap[name]} for the cat ${name}`
        );
      else interaction.editReply("This ID seems to be already banned...");
    } catch (error) {
      console.error("Error in cats command:", error);
      await interaction.editReply({
        content: "❌ Something went wrong.",
        embeds: [],
        components: [],
      });
    }
  },
};

export default rm;
