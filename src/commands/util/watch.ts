import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { CustomCommand } from "../../models/command";
import { fetchTCRCats } from "../../scraper";
import { extractPetId } from "../../models/cat";

let polling = false;
let seenIds = new Set();

const act = async (interaction: ChatInputCommandInteraction) => {
  console.log(`Polling TCR...`);
  const newIds = [];
  const cats = await fetchTCRCats("baby");
  const ids = cats.map((x) => extractPetId(x.url));
  for (const id of ids) {
    if (!seenIds.has(id)) {
      newIds.push(id);
      seenIds.add(id);
    }
  }

  if (newIds.length > 0) {
    interaction.followUp(`Found new babies on TCR. Ids ${newIds.join(", ")}`);
  }
};

const poll = (interaction: ChatInputCommandInteraction) => {
  if (polling) return;
  polling = true;
  setInterval(() => act(interaction), 5 * 60 * 1000);
};

export const watch: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("watch")
    .setDescription("Start polling TCR"),
  execute: async (interaction: ChatInputCommandInteraction): Promise<void> => {
    poll(interaction);
    interaction.reply("Polling TCR every 5 minutes now.");
  },
};

export default watch;
