import { Cat, ShallowCat } from "./models/cat";
import { parse } from "node-html-parser";

const THS_BASE_URL = "https://www.torontohumanesociety.com";
const getTCRUrl = (age: string) =>
  `https://searchtools.adoptapet.com/cgi-bin/searchtools.cgi/portable_pet_list?shelter_id=75215&size=450x600_gridnew&sort_by=age&clan_name=cat&age=${age};is_ajax=1`;
const THS_ADOPT_CATS_URL = `${THS_BASE_URL}/adoption-and-rehoming/adopt/cats/`;

export type RawCatResponse = Omit<Cat, "age"> & { age: string };

export const fetchTHSCats = async (): Promise<RawCatResponse[]> => {
  try {
    const response = await fetch(THS_ADOPT_CATS_URL);
    if (!response.ok) return [];
    const html = await response.text();
    const dom = parse(html);
    const catCards = Array.from(dom.querySelectorAll(".card_sect"));
    const eligibleCats: RawCatResponse[] = [];

    for (const card of catCards) {
      const link = card.querySelector("a")?.getAttribute("href");
      if (!link) continue;

      const pfp = card.querySelector("a > img")?.getAttribute("src") || "";
      const name = card.querySelector("h2")?.textContent?.trim() || "";
      const details = Array.from(card.querySelectorAll(".detail > p"));
      if (details.length < 5) continue;

      const onHoldText = details[4].textContent || "";
      if (onHoldText.includes("Yes")) continue;

      const gender = (details[0].textContent || "").replace("Gender : ", "") as
        | "Male"
        | "Female";
      const breed = (details[2].textContent || "").replace("Breed : ", "");
      const age = (details[3].textContent || "").replace("Age : ", "");

      eligibleCats.push({
        name,
        url: link,
        gender,
        breed,
        age,
        description: "",
        pfp,
      });
    }

    const detailsPromises = eligibleCats.map(async (cat) => {
      try {
        const response = await fetch(cat.url);
        if (!response.ok) return "";
        const html = await response.text();
        const dom = parse(html);
        const content = dom.querySelector(".pet-content");
        if (!content) return "";
        content.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
        return content.text || "";
      } catch (error) {
        console.error(`Error fetching details for ${cat.name}:`, error);
        return "";
      }
    });

    const descriptions = await Promise.all(detailsPromises);

    descriptions.forEach((description, index) => {
      eligibleCats[index].description = description;
    });

    return eligibleCats;
  } catch (error) {
    console.error("Error fetching THS cats:", error);
    return [];
  }
};

export const fetchTCRCats = async (age: string): Promise<ShallowCat[]> => {
  const response = await fetch(getTCRUrl(age));
  const html = await response.text();
  const dom = parse(html);
  const catElements = dom.querySelectorAll(".pet");
  const cats: ShallowCat[] = [];

  for (const catElement of catElements) {
    const name = catElement.querySelector(".name")?.textContent ?? "";
    const url = catElement.querySelector("a")?.getAttribute("href") ?? "";
    const breed = catElement.querySelectorAll("p")[1].textContent ?? "";
    cats.push({ name, url, breed });
  }

  return cats;
};
