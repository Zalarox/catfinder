import puppeteer from "puppeteer";
import { Cat } from "./models/cat";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const THS_BASE_URL = "https://www.torontohumanesociety.com";
const THS_ADOPT_CATS_URL = `${THS_BASE_URL}/adoption-and-rehoming/adopt/cats/`;

export type RawCatResponse = Omit<Cat, "age"> & { age: string };

export const fetchCats = async (): Promise<RawCatResponse[]> => {
  const browser = await puppeteer.launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
      "--js-flags=--max-old-space-size=256",
    ],
    headless: true,
  });

  const page = await browser.newPage();
  await page.goto(THS_ADOPT_CATS_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".card_sect", { timeout: 60000 });

  const cats = await page.evaluate(() => {
    const results: RawCatResponse[] = [];
    const catCards = document.querySelectorAll(".card_sect");
    for (const card of catCards) {
      const link = card.querySelector("a")?.getAttribute("href");
      const pfp = card.querySelector("a > img")?.getAttribute("src");
      const nameElement = card.querySelector("h2");
      const name = nameElement?.textContent?.trim() ?? "";
      const details = card.querySelectorAll(".detail > p");
      const detailText = [...details].map((x) => x.textContent?.trim() ?? "");
      const onHold = detailText[4].includes("Yes");
      if (onHold) continue;

      const gender = detailText[0].replace("Gender : ", "") as
        | "Male"
        | "Female";
      const breed = detailText[2].replace("Breed : ", "");
      const age = detailText[3].replace("Age : ", "");

      results.push({
        name,
        url: link,
        gender,
        breed,
        age,
        pfp,
      } as RawCatResponse);
    }

    return results;
  });

  return cats;
};
