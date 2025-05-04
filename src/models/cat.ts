import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  Colors,
  ComponentType,
  EmbedBuilder,
} from "discord.js";

export type Cat = {
  name: string;
  age: number;
  description: string | undefined;
  breed: string;
  gender: "Male" | "Female";
  url: string;
  pfp: string;
};

export type ShallowCat = {
  name: string;
  url: string;
  breed: string;
};

export const extractPetId = (url: string) => {
  // TCR URL... /pet/12345678-
  let match = url.match(/\/pet\/(\d+)-/);
  if (match) {
    return match[1];
  }

  // THS URL... ?ID=12345678
  const urlObj = new URL(url);
  const idParam = urlObj.searchParams.get("ID");
  if (idParam) {
    return idParam;
  }

  return null;
};

export const parseAgeToYears = (ageText: string): number => {
  const yearsMatch = ageText.match(/(\d+)\s+Year/);
  const monthsMatch = ageText.match(/(\d+)\s+Month/);

  const years = yearsMatch ? parseInt(yearsMatch[1], 10) : 0;
  const months = monthsMatch ? parseInt(monthsMatch[1], 10) : 0;

  const totalYears = years + months / 12;
  return parseFloat(totalYears.toFixed(2)); // limit to 2 decimal places
};

export const getCatEmbed = (
  cat: Cat,
  index: number,
  total: number
): EmbedBuilder => {
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
