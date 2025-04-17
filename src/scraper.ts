import playwright from "playwright-core";
import { Cat } from "./models/cat";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const THS_BASE_URL = "https://www.torontohumanesociety.com";
const THS_ADOPT_CATS_URL = `${THS_BASE_URL}/adoption-and-rehoming/adopt/cats/`;

export type RawCatResponse = Omit<Cat, "age"> & { age: string };

export const fetchCats = async (): Promise<RawCatResponse[]> => {
  const browser = await playwright.chromium.launch({
    headless: true,
    executablePath: "/usr/bin/chromium-browser",
    args: [
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-extensions",
      "--disable-background-networking",
      "--disable-sync",
      "--metrics-recording-only",
      "--mute-audio",
      "--no-default-browser-check",
      "--no-first-run",
      "--disable-default-apps",
      "--disable-popup-blocking",
      "--disable-translate",
      "--hide-scrollbars",
      "--disable-notifications",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-device-discovery-notifications",
    ],
  });

  const page = await browser.newPage();
  await page.goto(THS_ADOPT_CATS_URL, { waitUntil: "networkidle" });

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
