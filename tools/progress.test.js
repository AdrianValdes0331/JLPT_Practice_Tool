const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "renderer", "app.js"), "utf8");
const STORE_KEY = "jlpt-progress-v3";
const entries = ["vocabulary", "grammar", "kanji", "mdiccionary"].flatMap((section) =>
  Array.from({ length: 7 }, (_, i) => ({
    key: `${section}|word${i}|reading${i}`,
    section,
    word: `word${i}`,
    reading: `reading${i}`,
    meaning: `meaning${i}`,
    tags: [{ level: "N3", category: i < 3 ? "Small" : "Other" }],
  }))
);

class Element {
  constructor(tag, text = "") {
    this.tag = tag;
    this.nodeType = 1;
    this.children = [];
    this.text = text;
    this.className = "";
    this.style = {};
    this.listeners = {};
    this.attributes = {};
    this.classList = {
      add: (name) => { this.className += ` ${name}`; },
      toggle: (name, active) => {
        const names = new Set(this.className.split(" ").filter(Boolean));
        if (active) names.add(name);
        else names.delete(name);
        this.className = [...names].join(" ");
      },
    };
  }
  append(child) { this.children.push(child); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, handler) { this.listeners[name] = handler; }
  get textContent() { return this.text + this.children.map((child) => child.textContent).join(""); }
  set textContent(text) { this.text = text; this.children = []; }
  focus() {}
  blur() {}
  click() { this.listeners.click(); }
}

function boot(storage) {
  const app = new Element("main");
  const listeners = {};
  vm.runInNewContext(source, {
    window: { DATA: entries },
    document: {
      getElementById: () => app,
      createElement: (tag) => new Element(tag),
      createTextNode: (text) => new Element("#text", String(text)),
      addEventListener: (name, handler) => { listeners[name] = handler; },
    },
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    lucide: { icons: { Star: {} }, createElement: () => new Element("svg") },
    confirm: () => true,
    console,
  });
  const all = (node = app) => [node, ...node.children.flatMap((child) => all(child))];
  const byClass = (name) => all().filter((node) => node.className.split(" ").includes(name));
  const click = (text) => {
    const button = all().find((node) => node.tag === "button" && node.textContent === text);
    assert(button, `Button not found: ${text}`);
    button.click();
  };
  const word = () => byClass("kanji")[0].textContent;
  const answer = (correct = true) => {
    const entry = entries.find((entry) => entry.word === word());
    const expected = byClass("step")[0].textContent.includes("Reading") ? entry.reading : entry.meaning;
    const option = byClass("opt").find((node) => (node.children[1].textContent === expected) === correct);
    assert(option, "Answer option not found");
    option.click();
  };
  const finishWord = () => {
    const current = word();
    if (byClass("step")[0].textContent.includes("Reading")) {
      answer();
      click("Next ↵");
    }
    answer();
    click("Next ↵");
    return current;
  };
  return {
    click, word, answer, finishWord, byClass,
    escape: () => listeners.keydown({ key: "Escape", target: {}, preventDefault() {} }),
  };
}

function legacyStorage(section = "vocabulary", seen = false, size = 3) {
  return new Map([["jlpt-progress-v2", JSON.stringify({
    section, size, level: "all",
    words: Object.fromEntries(entries.map((entry) => [entry.key, { seen, missed: false }])),
  })]]);
}

const progress = (storage) => JSON.parse(storage.get(STORE_KEY));
const studied = (storage, section = "vocabulary") =>
  entries.filter((entry) => entry.section === section && progress(storage).words[entry.key].seen).length;

test("completed pools replay across restarts without reducing progress or repeating ordinary words", () => {
  const storage = legacyStorage("vocabulary", true);
  const seenThisRound = new Set();
  for (const size of [3, 3, 1]) {
    const ui = boot(storage);
    ui.click("All Vocabulary7 items · 7 seen");
    assert.equal(studied(storage), 7);
    assert.equal(ui.byClass("count")[0].textContent, `1 / ${size}`);
    for (let i = 0; i < size; i++) {
      const word = ui.finishWord();
      assert(!seenThisRound.has(word), `Repeated word: ${word}`);
      seenThisRound.add(word);
      assert.equal(studied(storage), 7);
    }
  }
  assert.equal(seenThisRound.size, 7);
  const ui = boot(storage);
  ui.click("All Vocabulary7 items · 7 seen");
  assert.equal(ui.byClass("count")[0].textContent, "1 / 3");
  assert.equal(studied(storage), 7);
});

test("quitting and restarting retains completed words but not an answer awaiting Next", () => {
  const storage = legacyStorage();
  let ui = boot(storage);
  ui.click("All Vocabulary7 items · 0 seen");
  const completed = [ui.finishWord(), ui.finishWord()];
  ui.answer();
  ui.click("Next ↵");
  ui.answer();
  assert.equal(studied(storage), 2);
  ui.click("← Quit");
  ui = boot(storage);
  assert.equal(studied(storage), 2);
  ui.click("All Vocabulary7 items · 2 seen");
  assert(!completed.includes(ui.word()));
  ui.finishWord();
  ui.escape();
  assert.equal(studied(storage), 3);
  assert.equal(studied(storage), entries.filter((entry) =>
    entry.section === "vocabulary" && progress(storage).words[entry.key].roundSeen).length);
});

test("missed-only remainder does not restart an unexhausted round; clean retry clears missed", () => {
  const storage = legacyStorage("vocabulary", true);
  const last = entries[0];
  const old = JSON.parse(storage.get("jlpt-progress-v2"));
  old.words[last.key] = { seen: false, missed: true };
  storage.set("jlpt-progress-v2", JSON.stringify(old));
  const ui = boot(storage);
  ui.click("All Vocabulary7 items · 6 seen · 1 to review");
  assert.equal(ui.word(), last.word);
  assert.equal(ui.byClass("count")[0].textContent, "1 / 1");
  assert.equal(studied(storage), 6);
  ui.answer(false);
  ui.click("Next ↵");
  ui.answer();
  ui.click("Next ↵");
  assert.equal(studied(storage), 7);
  assert.equal(progress(storage).words[last.key].missed, true);
  assert.equal(ui.byClass("count")[0].textContent, "2 / 2");
  ui.finishWord();
  assert.equal(progress(storage).words[last.key].missed, false);
});

test("replaying an overlapping category preserves section totals, and explicit reset stays reset", () => {
  const storage = legacyStorage("vocabulary", true);
  let ui = boot(storage);
  ui.click("Small3 items · 3 seen");
  ui.finishWord();
  ui.escape();
  assert.equal(studied(storage), 7);
  ui.click("Reset progress");
  assert.deepEqual(progress(storage).words, {});
  ui = boot(storage);
  ui.click("All Vocabulary7 items · 0 seen");
  assert.equal(studied(storage), 0);
});

test("partial sets persist in every section, Random and Favorites", () => {
  for (const section of ["vocabulary", "grammar", "kanji", "mdiccionary", "random", "favorites"]) {
    const storage = legacyStorage(section);
    if (section === "favorites") {
      storage.set("jlpt-favorites-v1", JSON.stringify(entries.slice(0, 7).map((entry) => entry.key)));
    }
    const ui = boot(storage);
    const label = {
      vocabulary: "All Vocabulary7", grammar: "All Grammar7", kanji: "All Kanji7",
      mdiccionary: "All M.Diccionary7", random: "Random mix21", favorites: "All Favorites7",
    }[section];
    ui.click(`${label} items · 0 seen`);
    ui.finishWord();
    ui.escape();
    boot(storage);
    assert.equal(Object.values(progress(storage).words).filter((record) => record.seen).length, 1, section);
  }
});
