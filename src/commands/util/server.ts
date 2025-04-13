import { SlashCommandBuilder } from "discord.js";
import { CustomCommand } from "../../models/command";

export const server: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("server")
    .setDescription("server information"),
  execute: async (interaction) => {
    await interaction.reply(
      `${interaction.guild?.name} has ${interaction.guild?.memberCount} members`
    );
  },
};

export default server;
