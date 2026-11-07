// Generates iOS JSON resources from the web app's source of truth (src/App.jsx).
// Run from the repo root:  node ios/tools/gen-data.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const lines = readFileSync(join(root, "src/App.jsx"), "utf8").split("\n");
const outDir = join(root, "ios/Sources/GozTransfo/Resources");

// Returns the literal text between `startLine` (1-based, containing "= {" or "= [")
// and the first following line that closes it at the same indentation.
function literal(startLine, closer) {
  const start = lines.findIndex((_, i) => i + 1 === startLine);
  const body = [];
  for (let i = start; i < lines.length; i++) {
    body.push(lines[i]);
    if (i > start && lines[i].trim() === closer) break;
  }
  const text = body.join("\n");
  return text.slice(text.indexOf("=") + 1).replace(/;\s*$/, "").trim();
}

const evalLit = text => new Function(`return (${text});`)();

const grocery = evalLit(literal(99, "};"));
const quotes = evalLit(literal(230, "];"));
const meals = evalLit(literal(3061, "};"));

const write = (name, data) =>
  writeFileSync(join(outDir, name), JSON.stringify(data, null, 2) + "\n");

write("grocery.json", grocery);
write("quotes.json", quotes);
write("meals.json", meals);

console.log("grocery phases:", Object.keys(grocery).length,
  "| quotes:", quotes.length,
  "| meal types:", Object.keys(meals).join(","));
