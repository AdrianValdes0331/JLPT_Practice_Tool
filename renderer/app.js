(() => {
  const ENTRIES = window.DATA;
  const SECTIONS = [
    { id: "vocabulary", label: "Vocabulary" },
    { id: "grammar", label: "Grammar" },
    { id: "kanji", label: "Kanji" },
    { id: "random", label: "Random" },
    { id: "mdiccionary", label: "M.Diccionary" },
  ];
  // Standalone sections are never part of the Random mix.
  const STANDALONE = ["mdiccionary"];
  const LEVELS = ["N5", "N4", "N3", "N2", "N1"];
  const sectionLabel = (id) => SECTIONS.find((s) => s.id === id).label;
  const STORE_KEY = "jlpt-progress-v2";
  const SIZES = [10, 20, 30, 50];
  const OPTION_COUNT = 6;

  const app = document.getElementById("app");

  // ---------- persistence ----------
  // words: { [entry.key]: { seen, missed } }; entry.key = "section|word|reading"
  const state = load();
  function load() {
    const base = { size: 20, section: "vocabulary", level: "all", words: {} };
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.words) return { ...base, ...s };
    } catch {}
    return base;
  }
  const save = () => localStorage.setItem(STORE_KEY, JSON.stringify(state));
  const rec = (key) => (state.words[key] ??= { seen: false, missed: false });

  // ---------- helpers ----------
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    }
    return el;
  }
  const shuffle = (a) => {
    const r = [...a];
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  };
  const mount = (...nodes) => {
    app.replaceChildren(...nodes);
    app.scrollTop = 0;
  };
  const firstMeaning = (w) => w.meaning.split(";")[0].trim().toLowerCase();

  let keyHandler = null;
  document.addEventListener("keydown", (e) => keyHandler && keyHandler(e));

  // ---------- pools ----------
  // spec = { section: vocabulary|grammar|kanji|random, level: "all"|N5..N1, category: "all"|"review"|<name> }
  const inScope = (e, spec) =>
    (spec.section === "random" ? !STANDALONE.includes(e.section) : e.section === spec.section) &&
    e.tags.some(
      (t) =>
        (spec.level === "all" || t.level === spec.level) &&
        (spec.category === "all" || spec.category === "review" || t.category === spec.category)
    );

  function poolFor(spec) {
    const pool = ENTRIES.filter((e) => inScope(e, spec));
    return spec.category === "review" ? pool.filter((e) => rec(e.key).missed) : pool;
  }

  function pickWords(pool, size) {
    size = Math.min(size, pool.length);
    // Near the end of a round, cap the set to the items not yet seen instead of topping up.
    const remaining = pool.filter((w) => !rec(w.key).seen).length;
    if (remaining > 0) size = Math.min(size, remaining);
    const missed = shuffle(pool.filter((w) => rec(w.key).missed)).slice(0, Math.ceil(size / 2));
    const chosen = new Set(missed.map((w) => w.key));
    const need = size - missed.length;

    let unseen = pool.filter((w) => !chosen.has(w.key) && !rec(w.key).seen);
    // Only start a new round once nothing is left unseen, so progress never drops mid-round.
    if (!unseen.length && need > 0) {
      for (const w of pool) rec(w.key).seen = false;
      unseen = pool.filter((w) => !chosen.has(w.key));
    }
    let picked = shuffle(unseen).slice(0, need);
    if (picked.length < need) {
      // Only reachable when missed words took slots from unseen ones; top up with seen words.
      const taken = new Set([...chosen, ...picked.map((w) => w.key)]);
      picked = picked.concat(shuffle(pool.filter((w) => !taken.has(w.key))).slice(0, need - picked.length));
    }
    return shuffle([...missed, ...picked]);
  }

  // Kana-only items (word equals reading, katakana counted as hiragana, trailing "(label)" ignored) skip the reading step.
  const toHira = (s) => s.replace(/[\u30a1-\u30f6]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
  const stripLabel = (s) => s.replace(/\s*[(（][^)）]*[)）]$/, "");
  const needsReading = (w) => toHira(stripLabel(w.word)) !== toHira(w.reading);

  // ---------- distractors ----------
  const sharesCategory = (a, b) => a.tags.some((t) => b.tags.some((u) => u.category === t.category));

  function readingOptions(word) {
    const used = new Set([word.reading]);
    const scored = ENTRIES.filter((w) => w.section === word.section && w.key !== word.key && w.reading !== word.reading)
      .map((w) => {
        let s = Math.random() * 2;
        if (sharesCategory(w, word)) s += 1;
        if (Math.abs(w.reading.length - word.reading.length) <= 1) s += 1.5;
        if ([...w.word].some((c) => word.word.includes(c))) s += 1.5;
        if (w.reading[0] === word.reading[0]) s += 0.7;
        if (w.reading.at(-1) === word.reading.at(-1)) s += 0.7;
        return { w, s };
      })
      .sort((a, b) => b.s - a.s);
    const out = [word.reading];
    for (const { w } of scored) {
      if (out.length === OPTION_COUNT) break;
      if (used.has(w.reading)) continue;
      used.add(w.reading);
      out.push(w.reading);
    }
    return shuffle(out).map((t) => ({ text: t, correct: t === word.reading }));
  }

  function meaningOptions(word) {
    const key = firstMeaning(word);
    const scored = ENTRIES.filter((w) => w.section === word.section && w.key !== word.key && w.meaning !== word.meaning && firstMeaning(w) !== key)
      .map((w) => ({ w, s: Math.random() + (sharesCategory(w, word) ? 0.5 : 0) }))
      .sort((a, b) => b.s - a.s);
    const out = [word.meaning];
    const seen = new Set([key]);
    for (const { w } of scored) {
      if (out.length === OPTION_COUNT) break;
      const k = firstMeaning(w);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(w.meaning);
    }
    return shuffle(out).map((t) => ({ text: t, correct: t === word.meaning }));
  }

  // ---------- views ----------
  function home() {
    keyHandler = null;
    const section = state.section;
    const sectionEntries = ENTRIES.filter((e) => (section === "random" ? !STANDALONE.includes(e.section) : e.section === section));
    const levels = LEVELS.filter((l) => sectionEntries.some((e) => e.tags.some((t) => t.level === l)));
    const level = levels.includes(state.level) ? state.level : "all";
    const base = { section, level };

    const chip = (label, active, onclick) => h("button", { class: "chip" + (active ? " active" : ""), onclick }, label);

    const sizeButtons = SIZES.map((n) => chip(String(n), state.size === n, () => update({ size: n })));
    const custom = h("input", {
      class: "custom-size", type: "number", min: 1, max: 200, placeholder: "other",
      value: SIZES.includes(state.size) ? "" : state.size,
      onchange: (e) => {
        const n = parseInt(e.target.value, 10);
        if (n > 0) update({ size: n });
      },
    });

    const card = (spec, name) => {
      const pool = poolFor(spec);
      const seen = pool.filter((w) => rec(w.key).seen).length;
      const missed = pool.filter((w) => rec(w.key).missed).length;
      return h("button", { class: "glass cat", onclick: () => start(spec) },
        h("div", { class: "name" }, name),
        h("div", { class: "meta" }, `${pool.length} items · ${seen} seen`,
          missed && spec.category !== "review" ? h("span", { class: "review" }, ` · ${missed} to review`) : null),
        h("div", { class: "bar" }, h("i", { style: `width:${pool.length ? (seen / pool.length) * 100 : 0}%` })));
    };

    const allPool = poolFor({ ...base, category: "all" });
    const missedTotal = allPool.filter((w) => rec(w.key).missed).length;
    const seenTotal = allPool.filter((w) => rec(w.key).seen).length;

    const categories = [];
    if (section !== "random") {
      for (const e of sectionEntries) {
        for (const t of e.tags) {
          if ((level === "all" || t.level === level) && !categories.includes(t.category)) categories.push(t.category);
        }
      }
    }

    const body = allPool.length
      ? [
          h("h2", {}, "Practice"),
          h("div", { class: "grid" },
            card({ ...base, category: "all" }, section === "random" ? "Random mix" : `All ${sectionLabel(section)}`),
            missedTotal ? card({ ...base, category: "review" }, "Review missed") : null),
          categories.length ? [h("h2", {}, "Categories"), h("div", { class: "grid" }, categories.map((c) => card({ ...base, category: c }, c)))] : null,
        ]
      : h("div", { class: "sub" }, `No entries yet. Add rows to data/${section}.csv and restart the app.`);

    mount(h("div", { class: "wrap" },
      h("div", { class: "topbar" },
        h("div", {},
          h("h1", {}, "JLPT ", h("span", {}, "Practice")),
          h("div", { class: "sub" }, `${seenTotal}/${allPool.length} studied · ${missedTotal} to review`)),
        h("div", { class: "sizes" }, h("span", { class: "sub", style: "margin:0 6px 0 0" }, "Set size"), sizeButtons, custom)),
      h("div", { class: "filters" },
        h("div", { class: "sizes" }, SECTIONS.map((s) => chip(s.label, section === s.id, () => update({ section: s.id })))),
        h("div", { class: "sizes" }, chip("All levels", level === "all", () => update({ level: "all" })),
          levels.map((l) => chip(l, level === l, () => update({ level: l }))))),
      body,
      h("h2", {}, ""),
      h("button", { class: "link", onclick: resetProgress }, "Reset progress")));
  }

  function update(patch) {
    Object.assign(state, patch);
    save();
    home();
  }

  function resetProgress() {
    if (!confirm("Reset all saved progress?")) return;
    state.words = {};
    save();
    home();
  }

  function start(spec) {
    const pool = poolFor(spec);
    if (!pool.length) return;
    const words = pickWords(pool, state.size);
    save();
    question({
      queue: words.map((word) => ({ word, retry: false, failed: false })),
      index: 0,
      step: needsReading(words[0]) ? 1 : 2,
      scored: { 1: 0, 2: 0 },
      missed: new Map(),
      total: words.length,
      readingTotal: words.filter(needsReading).length,
      spec,
    });
  }

  function question(s) {
    const item = s.queue[s.index];
    const { word } = item;
    const options = s.step === 1 ? readingOptions(word) : meaningOptions(word);
    let answered = false;

    const header = h("div", { class: "quiz-head" },
      h("button", { class: "chip", onclick: home }, "← Quit"),
      h("div", { class: "bar" }, h("i", { style: `width:${(s.index / s.queue.length) * 100}%` })),
      h("div", { class: "count" }, `${s.index + 1} / ${s.queue.length}`));

    const feedback = h("div", { class: "feedback" });
    const nextBtn = h("button", { class: "btn", style: "visibility:hidden", onclick: next }, "Next ↵");

    // Sentence panel stays open across both steps of the same item.
    const sentenceBtn = h("button", { class: "chip", onclick: () => { toggleSentences(); sentenceBtn.blur(); } });
    const sentenceBox = h("div", { class: "sentences" });
    // furi: ruby segments; a string is plain text and [base, reading] is ruby.
    const jaNodes = (x) => (x.furi ? x.furi.map((g) => (Array.isArray(g) ? h("ruby", {}, g[0], h("rt", {}, g[1])) : g)) : x.ja);
    function renderSentences() {
      const list = word.sentences || [];
      sentenceBtn.textContent = item.showSentences ? "Hide sentence (S)" : "Show sentence (S)";
      sentenceBox.hidden = !item.showSentences;
      sentenceBox.replaceChildren(...(list.length
        ? list.map((x) => h("div", { class: "sentence" }, h("div", { class: "ja" }, jaNodes(x)), h("div", { class: "en" }, x.en)))
        : [h("div", { class: "none" }, "No sentence available")]));
    }
    function toggleSentences() {
      item.showSentences = !item.showSentences;
      renderSentences();
    }
    renderSentences();

    const buttons = options.map((o, i) =>
      h("button", { class: "opt" + (s.step === 2 ? " en" : ""), onclick: () => choose(i) },
        h("span", { class: "key" }, String(i + 1)), o.text));

    function choose(i) {
      if (answered) return;
      answered = true;
      const ok = options[i].correct;
      buttons.forEach((b, j) => {
        b.disabled = true;
        if (options[j].correct) b.classList.add("correct");
      });
      if (!ok) buttons[i].classList.add("wrong");

      if (!item.retry && ok) s.scored[s.step]++;
      if (!ok) {
        item.failed = true;
        s.missed.set(word.key, word);
      }
      feedback.className = "feedback " + (ok ? "ok" : "no");
      feedback.textContent = ok ? "Correct" : "Not quite — it will come back for review";
      nextBtn.style.visibility = "visible";
      nextBtn.focus();
    }

    function next() {
      if (!answered) return;
      if (s.step === 1) {
        s.step = 2;
        return question(s);
      }
      const r = rec(word.key);
      r.seen = true;
      if (item.failed) {
        r.missed = true;
        if (!item.retry) s.queue.push({ word, retry: true, failed: false });
      } else if (r.missed) {
        // clean pass on a missed word clears the review flag
        r.missed = false;
      }
      save();
      s.index++;
      if (s.index >= s.queue.length) return results(s);
      s.step = needsReading(s.queue[s.index].word) ? 1 : 2;
      question(s);
    }

    keyHandler = (e) => {
      if (e.key >= "1" && e.key <= String(OPTION_COUNT)) choose(Number(e.key) - 1);
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        next();
      } else if (e.key === "Escape") home();
      else if (e.key === "s" || e.key === "S") toggleSentences();
    };

    const stepLabel = (s.step === 1 ? "Step 1 · Reading" : "Step 2 · Meaning") + ` · ${sectionLabel(word.section)}`;
    const body = h("div", { class: "glass card" },
      h("div", { class: "step" }, stepLabel, item.retry ? h("span", { class: "badge-review" }, "REVIEW") : null),
      h("div", { class: "kanji" }, word.word),
      s.step === 2 && needsReading(word) ? h("div", { class: "reading" }, word.reading) : null,
      h("div", { class: "prompt" }, s.step === 1 ? "Select the correct reading" : "Select the correct English meaning"),
      h("div", { class: "options" }, buttons),
      h("div", { class: "sentence-toggle" }, sentenceBtn),
      sentenceBox,
      h("div", { class: "footer" }, feedback, nextBtn));

    mount(h("div", { class: "wrap" }, header, body));
  }

  function results(s) {
    keyHandler = (e) => {
      if (e.key === "Enter") start(s.spec);
      else if (e.key === "Escape") home();
    };
    const perStep = s.total;
    const pct = Math.round(((s.scored[1] + s.scored[2]) / (s.readingTotal + perStep)) * 100);
    const missed = [...s.missed.values()];

    mount(h("div", { class: "wrap" },
      h("div", { class: "glass result" },
        h("div", { class: "sub", style: "margin:0" }, "Set complete"),
        h("div", { class: "score" }, `${pct}%`),
        h("div", { class: "stats" },
          h("div", {}, h("b", {}, `${s.scored[1]}/${s.readingTotal}`), "Readings"),
          h("div", {}, h("b", {}, `${s.scored[2]}/${perStep}`), "Meanings"),
          h("div", {}, h("b", {}, String(missed.length)), "To review")),
        missed.length
          ? h("div", { class: "missed" },
              h("h2", {}, "Missed"),
              missed.map((w) =>
                h("div", { class: "row" }, h("span", { class: "k" }, w.word), h("span", { class: "r" }, w.reading), h("span", { class: "m" }, w.meaning))))
          : null,
        h("div", { class: "actions" },
          h("button", { class: "btn ghost", onclick: home }, "Back"),
          h("button", { class: "btn", onclick: () => start(s.spec) }, "Another set ↵")))));
  }

  home();
})();
