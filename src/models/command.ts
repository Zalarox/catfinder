import { CommandInteraction, SlashCommandBuilder } from "discord.js";

export type CustomCommand = {
  data: SlashCommandBuilder;
  execute: (interaction: CommandInteraction) => Promise<void>;
};
