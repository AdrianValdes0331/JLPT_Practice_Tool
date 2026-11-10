# JLPT Practice Tool

Electron desktop quiz for JLPT study. Pick a section (Vocabulary, Grammar, Kanji or Random), an optional level (N5–N1) and a category, choose a set size, then answer two multiple-choice steps per item:

1. Word → select the correct reading (6 options)
2. Word + reading → select the correct English meaning (6 options)

If the word has no kanji (it equals its reading, katakana counted as hiragana), step 1 is skipped.

Progress is saved locally. Items don't repeat until the pool is exhausted, and missed items are re-asked at the end of the set and mixed into later sets until answered cleanly.

Use the star on a quiz item or missed result to add or remove a favorite. **Favorites** is one saved list across all sections and levels, including M.Diccionary. It shows your saved words with removal controls and supports the usual set sizes, scoring, and missed-item review. Changes update the list immediately; a set already in progress keeps its original items. Favorites persist across restarts and are not erased by Reset progress.

## Run

```
npm install
npm start        # rebuilds renderer/data.js from data/*.csv, then launches the app
npm run dist     # portable Windows exe
```

Or double-click `JLPT Practice.lnk` (or `JLPT Practice.vbs`) in the project folder: it rebuilds the data and opens the app without a console. Copy the `.lnk` to the Desktop for a shortcut. If the project folder moves, recreate the `.lnk` (right-click `JLPT Practice.vbs` > Send to > Desktop (create shortcut)) and set its icon to `Icons\icon.ico`.

The window/taskbar icon comes from `Icons/icon.ico`, generated from `Icons/Designer.png` by `powershell -File tools\make_icon.ps1` (rerun it if the artwork changes).

If `npm install` fails with "unable to get local issuer certificate" (corporate proxy), run it with `$env:NODE_OPTIONS="--use-system-ca"` and, if Electron's binary did not download, `node node_modules/electron/install.js`.

## Setting up on a new device

Install Node.js (LTS), then in the project folder run `npm install` and `npm start`. Don't copy `node_modules/` from another machine: Electron downloads a platform-specific binary, and copied files get flagged by Windows. Repeating `npm install` rarely fixes an Electron error; check these in order:

1. **Electron binary missing or partial**: delete `node_modules\electron\dist`, then run `node node_modules/electron/install.js` (with `$env:NODE_OPTIONS="--use-system-ca"` set first if behind a corporate proxy).
2. **Electron installed but won't start**: if `NODE_OPTIONS` is set (e.g. `--use-system-ca`), Electron refuses to launch. Clear it in the same terminal with `$env:NODE_OPTIONS=""` and run `npm start` again. `JLPT Practice.vbs` already clears it.
3. **Blocked by Windows** (SmartScreen, Defender, AppLocker, or the "downloaded from the internet" flag on copied files): run `Get-ChildItem -Recurse <project folder> | Unblock-File`, and check that Defender didn't quarantine `node_modules\electron\dist\electron.exe`. Locked-down machines may need an IT exception, since the binaries are unsigned.
4. **`JLPT Practice.vbs` does nothing or errors**: Windows Script Host may be disabled by policy, or Node.js is missing (the script runs `node tools\build_data.js`). Use `npm start` instead.
5. **Only need to practice, not edit**: run `npm run dist` on a working machine and copy the portable `.exe` from `dist\`. It needs no Node or npm; if SmartScreen warns, choose "More info" > "Run anyway".

## Adding content

All content lives in `data/*.csv`. Every file is read; the filename doesn't matter. Edit in Excel or any text editor (UTF-8), then restart the app (or run `npm run build-data`).

Header (exact, in this order):

```
section,level,category,word,reading,meaning
```

| Column | Rules |
|---|---|
| `section` | `vocabulary`, `grammar`, `kanji` or `mdiccionary` |
| `level` | `N5`, `N4`, `N3`, `N2`, `N1`. Several levels: `N4\|N3` |
| `category` | Free text, used to group items. Several categories: `Education\|School life` |
| `word` | What is shown: a word, a grammar pattern (`〜に関して`) or a single kanji (`政`) |
| `reading` | The hiragana answer for step 1 |
| `meaning` | English meaning for step 2. Use `;` between synonyms |

Notes:
- Wrap a field in double quotes if it contains a comma.
- The same item may appear in several levels/categories, either with `|` in one row or as repeated rows. Items are identified by `section + word + reading`, so progress is shared across levels/categories.
- If the same item has two different meanings, the first one wins (the build prints a warning).
- The build fails with the file and line number on an invalid section, level, empty category, or missing field.
- `grammar.csv` and `kanji.csv` currently hold only a few starter samples; verify and extend them.
- `mdiccionary.csv` is the standalone **M.Diccionary** section: Miguel Palencia's dictionary, transcribed from the page images in `M.Palencia Diccionario/`. Meanings are in Spanish, the level is `N3` for now, and categories are the image subfolders. It is never included in Random.
- `vocabulary.csv` holds the N3 list plus a few sample rows each for N5, N4, N2 and N1 (at the end of the file); replace or extend them.

### Example sentences (optional)

Every question has a **Show sentence** button (key `S`) that lists up to 3 example sentences for the item, or "No sentence available" if there are none. Sentences are optional: items without them just show that message.

Sentences live in `data/sentences/*.csv` (every file is read, filename doesn't matter), one row per item:

```
section,word,ja1,en1,ja2,en2,ja3,en3
```

- Rows are matched to items by `section` + `word` (the `word` column of the main CSVs). Unmatched rows are ignored with a warning.
- `ja2/en2` and `ja3/en3` are optional; a Japanese sentence needs its English translation. Anything past 3 pairs is ignored.
- Wrap English in double quotes if it contains a comma.
- Furigana is generated automatically at build time (kuroshiro, installed by `npm install`) and cached in `tools/.furigana-cache.json`; no markup is needed. If a reading comes out wrong, force it in the Japanese cell with `漢字[よみ]`, e.g. `あの角[かど]を右に曲がって`; the brackets are not shown. Readings that are wrong everywhere can instead go in `FURIGANA_FIXES` in `tools/build_data.js`. Without kuroshiro the build still works, just without furigana.
- The bundled sentences were written for this app in a consistent, simple style (not copied from Matome, Bunpro or other books). Every bundled item has sentences.
