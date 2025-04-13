import {
  APIInteractionGuildMember,
  GuildMember,
  SlashCommandBuilder,
} from "discord.js";
import { CustomCommand } from "../../models/command";

export const user: CustomCommand = {
  data: new SlashCommandBuilder()
    .setName("user")
    .setDescription("user information"),
  execute: async (interaction) => {
    await interaction.reply(
      `${interaction.user.username} joined on ${
        (interaction.member as APIInteractionGuildMember).joined_at
      }`
    );
  },
};

export default user;
