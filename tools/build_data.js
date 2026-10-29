// Builds renderer/data.js from every data/*.csv file. Run via `npm run build-data` (also runs before `npm start`).
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const SENTENCE_DIR = path.join(DATA_DIR, "sentences");
const OUT = path.join(ROOT, "renderer", "data.js");

const SECTIONS = ["vocabulary", "grammar", "kanji", "mdiccionary"];
const LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const COLUMNS = ["section", "level", "category", "word", "reading", "meaning"];
const MULTI = "|"; // separates several levels/categories inside one cell
const MAX_SENTENCES = 3;
const SENTENCE_COLUMNS = ["section", "word", "ja1", "en1", "ja2", "en2", "ja3", "en3"];
// In a Japanese cell, 漢字[よみ] forces that reading for the furigana; the brackets are removed from the shown text.
const MARK = /([\u3400-\u9fff々]+)\[([^\]]+)\]/g;
// The analyzer's wrong readings for words with no context ambiguity here: "base:reading" -> correct reading.
const FURIGANA_FIXES = {
  "日本:にっぽん": "にほん", "日本人:にっぽんじん": "にほんじん", "三角形:さんかっけい": "さんかくけい", "緑色:りょくしょく": "みどりいろ",
  "預:あづ": "あず", "図形:づけい": "ずけい", "章:あきら": "しょう", "何時:いつ": "なんじ", "他:た": "ほか",
  "角:かく": "かど", "辛:つら": "から", "表:ひょう": "おもて", "十分:じゅうぶん": "じゅっぷん", "今:こん": "いま",
  "行:ゆ": "い", "米:まい": "こめ", "来:きた": "こ",
};

// Minimal RFC 4180 parser: quoted fields, escaped quotes, commas and newlines inside quotes.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      rows.push(row); row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

const errors = [];
const warnings = [];
const entries = new Map(); // key -> entry

const files = fs.readdirSync(DATA_DIR).filter((f) => f.toLowerCase().endsWith(".csv")).sort();
for (const file of files) {
  const text = fs.readFileSync(path.join(DATA_DIR, file), "utf8").replace(/^\uFEFF/, "");
  const [header, ...body] = parseCsv(text);
  if (!header || COLUMNS.some((c, i) => (header[i] || "").trim().toLowerCase() !== c)) {
    errors.push(`${file}: header must be exactly: ${COLUMNS.join(",")}`);
    continue;
  }
  body.forEach((raw, idx) => {
    const where = `${file}:${idx + 2}`;
    const [section, level, category, word, reading, meaning] = COLUMNS.map((_, i) => (raw[i] || "").trim());
    const sec = section.toLowerCase();
    const levels = level.split(MULTI).map((s) => s.trim().toUpperCase()).filter(Boolean);
    const cats = category.split(MULTI).map((s) => s.trim()).filter(Boolean);

    if (!SECTIONS.includes(sec)) return errors.push(`${where}: section "${section}" must be one of ${SECTIONS.join(", ")}`);
    if (!levels.length || levels.some((l) => !LEVELS.includes(l))) return errors.push(`${where}: level "${level}" must be ${LEVELS.join("/")}`);
    if (!cats.length) return errors.push(`${where}: category is empty`);
    if (!word || !reading || !meaning) return errors.push(`${where}: word, reading and meaning are required`);

    const key = `${sec}|${word}|${reading}`;
    let entry = entries.get(key);
    if (!entry) {
      entry = { key, section: sec, word, reading, meaning, tags: [] };
      entries.set(key, entry);
    } else if (entry.meaning !== meaning) {
      warnings.push(`${where}: "${word}" already defined with a different meaning; keeping the first`);
    }
    for (const l of levels) for (const c of cats) {
      if (!entry.tags.some((t) => t.level === l && t.category === c)) entry.tags.push({ level: l, category: c });
    }
  });
}

// Optional example sentences: data/sentences/*.csv, matched to entries by section + word.
let sentenceCount = 0;
const sentenceFiles = fs.existsSync(SENTENCE_DIR)
  ? fs.readdirSync(SENTENCE_DIR).filter((f) => f.toLowerCase().endsWith(".csv")).sort()
  : [];
const byWord = new Map(); // "section|word" -> entries
for (const e of entries.values()) {
  const k = `${e.section}|${e.word}`;
  byWord.set(k, [...(byWord.get(k) || []), e]);
}
for (const file of sentenceFiles) {
  const text = fs.readFileSync(path.join(SENTENCE_DIR, file), "utf8").replace(/^\uFEFF/, "");
  const [header, ...body] = parseCsv(text);
  if (!header || SENTENCE_COLUMNS.slice(0, 4).some((c, i) => (header[i] || "").trim().toLowerCase() !== c)) {
    errors.push(`sentences/${file}: header must start with: ${SENTENCE_COLUMNS.join(",")}`);
    continue;
  }
  body.forEach((raw, idx) => {
    const where = `sentences/${file}:${idx + 2}`;
    const cell = (i) => (raw[i] || "").trim();
    const sec = cell(0).toLowerCase();
    const word = cell(1);
    const targets = byWord.get(`${sec}|${word}`);
    if (!targets) return warnings.push(`${where}: no ${sec} entry "${word}"; row ignored`);
    const list = [];
    for (let n = 0; n < MAX_SENTENCES; n++) {
      const text = cell(2 + n * 2);
      const en = cell(3 + n * 2);
      const ja = text.replace(MARK, "$1");
      if (ja && en) list.push(ja === text ? { ja, en } : { ja, en, src: text });
      else if (ja || en) warnings.push(`${where}: sentence ${n + 1} needs both Japanese and English; skipped`);
    }
    if (!list.length) return;
    for (const e of targets) {
      if (!e.sentences) sentenceCount++;
      e.sentences = list;
    }
  });
}

warnings.forEach((w) => console.warn("warning:", w));
if (errors.length) {
  errors.forEach((e) => console.error("error:", e));
  process.exit(1);
}

const list = [...entries.values()];

// Furigana is generated from the Japanese text as ruby segments: a string is plain text, [base, reading] is ruby.
// Needs kuroshiro (devDependency); without it the build still succeeds and sentences just have no furigana.
const CACHE = path.join(__dirname, ".furigana-cache.json");
async function addFurigana() {
  const sentences = [...new Set(list.flatMap((e) => e.sentences || []))];
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(CACHE, "utf8")); } catch {}

  // Text outside forced-reading marks, split at the marks; each plain piece is analyzed on its own.
  const pieces = (s) => (s.src || s.ja).split(MARK).reduce((out, part, i, a) => {
    if (i % 3 === 0) { if (part) out.push({ text: part }); }
    else if (i % 3 === 1) out.push({ ruby: [part, a[i + 1]] });
    return out;
  }, []);
  const needed = new Set(sentences.flatMap((s) => pieces(s).filter((p) => p.text && /[\u3400-\u9fff]/.test(p.text)).map((p) => p.text)));
  const todo = [...needed].filter((t) => !cache[t]);

  if (todo.length) {
    let kuroshiro;
    try {
      const Kuroshiro = require("kuroshiro");
      const Analyzer = require("kuroshiro-analyzer-kuromoji");
      kuroshiro = new (Kuroshiro.default || Kuroshiro)();
      await kuroshiro.init(new Analyzer());
    } catch (err) {
      console.warn(`warning: furigana skipped (${err.message}); run npm install`);
    }
    if (kuroshiro) {
      const RUBY = /<ruby>(.*?)<rp>\(<\/rp><rt>(.*?)<\/rt><rp>\)<\/rp><\/ruby>/g;
      for (const text of todo) {
        const html = await kuroshiro.convert(text, { mode: "furigana", to: "hiragana" });
        const segs = [];
        let last = 0;
        for (const m of html.matchAll(RUBY)) {
          if (m.index > last) segs.push(html.slice(last, m.index));
          segs.push([m[1], m[2]]);
          last = m.index + m[0].length;
        }
        if (last < html.length) segs.push(html.slice(last));
        cache[text] = segs;
      }
      fs.writeFileSync(CACHE, JSON.stringify(cache), "utf8");
    }
  }

  for (const s of sentences) {
    const fixed = (g) => (Array.isArray(g) ? [g[0], FURIGANA_FIXES[`${g[0]}:${g[1]}`] || g[1]] : g);
    const segs = pieces(s).flatMap((p) => (p.ruby ? [p.ruby] : (cache[p.text] || [p.text]).map(fixed)));
    if (segs.some(Array.isArray)) s.furi = segs;
    delete s.src;
  }
}
addFurigana().then(() => {
  fs.writeFileSync(OUT, `window.DATA = ${JSON.stringify(list)};\n`, "utf8");
  const counts = SECTIONS.map((s) => `${s}: ${list.filter((e) => e.section === s).length}`).join(", ");
  console.log(`data.js built from ${files.length} file(s) — ${list.length} entries (${counts}), ${sentenceCount} with example sentences`);
});
