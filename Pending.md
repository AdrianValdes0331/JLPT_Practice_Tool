# Pending: M.Diccionary

Section `mdiccionary` ("M.Diccionary", Miguel Palencia's dictionary) is wired in and `data/mdiccionary.csv` holds the 503 rows transcribed so far (Colores, Frutas, Verduras, Animales, Verbos). Everything below is still to do.

## 1. Folders not yet transcribed

Base folder: `M.Palencia Diccionario/Diccionario/<Category>/` (JPG pages). Page counts in parentheses.

| Category (use this exact name in the CSV) | Pages |
|---|---|
| Adjetivos い | 8 (files `1.jpg`..`8.jpg`) |
| Adjetivos な | 14 |
| Adverbios | 12 |
| Adverbios de Localizacion | 4 |
| Familia | 4 |
| Deportes | 4 |
| Tiempo | 4 |
| Genero de Libros | 4 |
| Genero de Cine | 2 |
| Genero de Musica | 2 |
| Profesiones | 6 |
| Sufijos Contables | 4 |
| Dias festivos de Japon (folder `Otros/Dias festivos de Japon`) | 2 |
| Particulas (folder `Otros/Particulas`) | 4 |

Already done, do not redo: Colores, Frutas, Verduras, Animales, Verbos (all 58 pages).

## 2. Instructions for the agent

Read `README.md` and `AGENTS.md` first.

**Page format.** Pages alternate. A page of numbered Spanish meanings (items 1-15, the next Spanish page continues 16-30) is followed by a Japanese page with the same item numbers, written `漢字 [ひらがな]`. Kana-only words have no bracket. Blank numbered lines are skipped. Titles and dates are ignored. Pair item N Spanish with item N Japanese, within the same category.

**Output.** Append rows to `data/mdiccionary.csv`. Header is `section,level,category,word,reading,meaning`. Row format:

```
mdiccionary,N3,<Category>,<Japanese word as written>,<hiragana reading>,<Spanish meaning verbatim>
```

- `level` is `N3` for now (the level is unknown).
- `category` is the folder name above (for `Otros/...` use the leaf name, e.g. `Particulas`).
- `reading` is hiragana only. For kana-only words convert katakana to hiragana and keep `ー`.
- If a handwritten reading is evidently wrong or cut off, use the correct standard reading. Handwriting makes う/ら/ろ/る, つ/し, こ/ご, そ/さ, い/ひ look alike.
- `meaning` is copied verbatim in Spanish (capitalization, missing accents, slashes, parentheses). Do not translate or fix it. Quote fields that contain a comma.
- Save as UTF-8, LF line endings, no BOM.

**Practical notes learned.**
- View each image with the image viewing tool; don't guess from file names.
- A subagent given more than about 6 images, or several folders at once, returned nothing. Use one folder and at most 6 images per subagent; several subagents can run in parallel, each writing its own draft file (e.g. `tools/_draft/<Category>.csv`). Merge the drafts into `data/mdiccionary.csv` (skip each header) and delete `tools/_draft` afterwards. Start batches at an odd page so each batch holds whole Spanish/Japanese pairs.
- Ask each subagent for a short report of corrected or uncertain items, and always ask for a non-empty text reply.

**Verify.** Run `npm run build-data`. It must succeed. A warning such as `already defined with a different meaning; keeping the first` means the same word appears twice with different meanings, and the second one is dropped. Then `node --check renderer/app.js`, run `npm start`, and try one set in M.Diccionary.

## 3. Known issues to review in the existing data

- Entries whose reading is hiragana only, where the Japanese page had only kana, may be kanji words the teacher wrote in kana (e.g. `かくはんする`). They were kept as written.
- Some transcription slips by the writer were kept (e.g. Verbos item 182 meaning "Verbo", item 53 "Mirar/ver"); item 75 is missing on the source pages.
- Duplicate words with different Spanish meanings (about 14, e.g. 遅れる, 貼る, 残す, 編む, 噛む) are reported as build warnings. Only the first meaning is kept. Decide whether to merge them with `;` into one meaning.
- Spot-check readings of rare words in Verbos (items 300+) against a dictionary.

## 4. Next request: example sentences

Add sentences for M.Diccionary entries in `data/sentences/` using the existing format `section,word,ja1,en1,ja2,en2,ja3,en3` with `section` = `mdiccionary`. Keep the style consistent with the bundled sentences. The `en` columns can be Spanish or English; decide with the user.
