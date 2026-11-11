const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "dist", "mobile");

test("mobile assets are self-contained without changing desktop sources", () => {
  const sources = new Map(
    ["index.html", "app.js", "styles.css", "data.js"].map((file) => [
      file, fs.readFileSync(path.join(ROOT, "renderer", file)),
    ])
  );
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "obsolete.js"), "stale asset");
  execFileSync(process.execPath, [path.join(ROOT, "tools", "build_mobile.js")]);

  const html = fs.readFileSync(path.join(OUT, "index.html"), "utf8");
  for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const asset = match[1];
    assert(!asset.includes("..") && !asset.includes(":"), `Non-local mobile asset: ${asset}`);
    assert(fs.statSync(path.join(OUT, asset)).isFile(), `Missing mobile asset: ${asset}`);
  }
  assert.match(html, /name="viewport" content="width=device-width, initial-scale=1"/);
  assert(!fs.existsSync(path.join(OUT, "obsolete.js")), "Stale build assets should be removed");
  assert.deepEqual(fs.readFileSync(path.join(OUT, "lucide.js")),
    fs.readFileSync(path.join(ROOT, "node_modules", "lucide", "dist", "umd", "lucide.js")));
  for (const [file, contents] of sources) {
    assert.deepEqual(fs.readFileSync(path.join(ROOT, "renderer", file)), contents);
    if (file !== "index.html") assert.deepEqual(fs.readFileSync(path.join(OUT, file)), contents);
  }
});
