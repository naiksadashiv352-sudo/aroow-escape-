import { readFileSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync("index.html", "utf8");
const platform = readFileSync("platform.js", "utf8");
const css = readFileSync("brand.css", "utf8");

const inlineScripts = [...html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/gi)]
  .map(match => match[1].trim())
  .filter(Boolean);

if (!html.includes('id="board"')) throw new Error("Game board is missing");
if (!html.includes("const MAXL=2000")) throw new Error("2000-level progression constant is missing");
if (!html.includes("lvl:1")) throw new Error("New players must start at level 1");
if (!html.includes("./brand.css") || !html.includes("./platform.js")) throw new Error("Platform assets are not connected");
if (!css.includes("#087f5b") || !css.includes("#c6ff65")) throw new Error("Brand palette is incomplete");
if (!platform.includes("Chapter") || !platform.includes("Grandmaster")) throw new Error("Progression UI is incomplete");

for (const [i, source] of inlineScripts.entries()) {
  new vm.Script(source, { filename: `index-inline-${i + 1}.js` });
}
new vm.Script(platform, { filename: "platform.js" });

console.log(`Static checks passed: ${inlineScripts.length} inline script(s), platform.js, branding, level cap and new-player start.`);
