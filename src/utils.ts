import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const BANLIST_PATH = path.join(__dirname, "banlist.json");
