const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist", "mobile");
const files = new Map(
  ["index.html", "app.js", "styles.css", "data.js"].map((file) => [
    file, fs.readFileSync(path.join(ROOT, "renderer", file)),
  ])
);
files.set("lucide.js", fs.readFileSync(path.join(ROOT, "node_modules", "lucide", "dist", "umd", "lucide.js")));

let html = files.get("index.html").toString("utf8");
const lucidePath = "../node_modules/lucide/dist/umd/lucide.js";
if (html.split(lucidePath).length !== 2 || !html.includes("<head>")) {
  throw new Error("Mobile build requires a <head> and exactly one expected Lucide script reference in renderer/index.html.");
}
html = html.replace(lucidePath, "lucide.js").replace(
  "<head>",
  '<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1" />'
);
files.set("index.html", html);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
for (const [file, contents] of files) {
  fs.writeFileSync(path.join(OUT, file), contents);
}
console.log("Mobile web assets built in dist/mobile.");
