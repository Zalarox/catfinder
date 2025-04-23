import puppeteer from "puppeteer-core";
import { Cat } from "./models/cat";

const THS_BASE_URL = "https://www.torontohumanesociety.com";
const THS_ADOPT_CATS_URL = `${THS_BASE_URL}/adoption-and-rehoming/adopt/cats/`;
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

export type RawCatResponse = Omit<Cat, "age"> & { age: string };

export const fetchCats = async (): Promise<RawCatResponse[]> => {
  // Launch browser with minimal options
  const browser = await puppeteer.launch({
    headless: true, // Using the new headless mode for better performance
    executablePath: EDGE,
    args: [
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-extensions",
    ],
  });

  try {
    const page = await browser.newPage();

    // Configure browser for speed, but allow all image requests
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const resourceType = request.resourceType();
      // Allow document, scripts, XHR, fetch, and ALL images
      if (
        ["document", "xhr", "fetch", "script", "image"].includes(resourceType)
      ) {
        request.continue();
      } else {
        // Block CSS, fonts, and other non-essential resources
        request.abort();
      }
    });

    // Disable CSS and font parsing
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    await page.setCacheEnabled(false);

    // Navigate with minimal wait strategy
    await page.goto(THS_ADOPT_CATS_URL, {
      waitUntil: "domcontentloaded",
      timeout: 20000,
    });

    // Wait only for the essential elements
    await page.waitForSelector(".card_sect", { timeout: 10000 });

    // Extract data using direct selectors for better performance
    const cats = await page.evaluate(() => {
      const results: RawCatResponse[] = [];
      const catCards = document.querySelectorAll(".card_sect");

      for (const card of catCards) {
        const link = card.querySelector("a")?.getAttribute("href");
        const pfp = card.querySelector("a > img")?.getAttribute("src");
        const name = card.querySelector("h2")?.textContent?.trim() || "";

        // Direct selector lookups
        const details = card.querySelectorAll(".detail > p");

        // Skip processing if the card doesn't have the expected structure
        if (details.length < 5) continue;

        const onHoldText = details[4].textContent || "";
        if (onHoldText.includes("Yes")) continue;

        const gender = (details[0].textContent || "").replace(
          "Gender : ",
          ""
        ) as "Male" | "Female";
        const breed = (details[2].textContent || "").replace("Breed : ", "");
        const age = (details[3].textContent || "").replace("Age : ", "");

        results.push({
          name,
          url: link ?? "",
          gender,
          breed,
          age,
          pfp: pfp ?? "",
        });
      }
      return results;
    });

    return cats;
  } finally {
    await browser.close();
  }
};
