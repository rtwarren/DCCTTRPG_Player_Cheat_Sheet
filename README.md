# Crawler Cheat Sheet

Source for `Crawler_Cheat_Sheet.html`, the player reference and calculator page for the Dungeon Crawler Carl Roleplaying Game. The finished page is one self-contained HTML file that works offline. The readable source is in `src/`, and the built page is in `dist/`.

## Folder layout

| Path | What it is |
| --- | --- |
| `src/index.html` | Page markup: hero, section tabs, every rules section and the Calculators panel. Has two placeholders, `/*__STYLES__*/` and `/*__SCRIPT__*/`. |
| `src/styles.css` | All styling, including light and dark themes, phone layout and print layout. Headings use the system font Bahnschrift (built into Windows), with Arial Narrow as the fallback. |
| `src/main.js` | Everything interactive: floor picker, tabs, search, hover equations, the calculators, and linking the character sheet. `/*__PDFENGINE__*/` is where `pdf-engine.js` goes. |
| `src/pdf-engine.js` | A small PDF reader and writer with no libraries. Reads form fields and saves changes as an incremental update. |
| `build.py` | Combines the pieces into one HTML file. |
| `dist/Crawler_Cheat_Sheet.html` | The built page. This is the file to open or share. |
| `CHANGELOG.md` | What changed in each version. |
| `tests/test-pdf-engine.js` | Round-trip test for the PDF engine (Node 18+, no packages). |
| `tests/browser-test.js` | End-to-end test of the built page in Chromium (needs Playwright). |

## Building

```
python build.py
```

This writes `dist/Crawler_Cheat_Sheet.html`. Pass a path to write somewhere else: `python build.py test.html`. It needs Python 3.8 or newer and no extra packages.

Edit the files in `src/`, then run the build again. Don't edit the built HTML by hand; the next build overwrites it.

## Where things live in the code

- **Floor-aware numbers.** In `index.html`, a yellow number is a `span.lv`. It has `data-f` (a formula using `F`, like `10+2*F`), `data-d` (dice plus floor, like `1d6`), or `data-lk` (a lookup, like `timer` or `gold`). `setFloor()` in `main.js` fills them in and writes their hover equations. Formulas must have the form `A+B*F` (either part optional); they are parsed, never run as code.
- **Floor-only rules.** Any element with `data-floors="1-2"` or `data-floors="3-5"` is dimmed when the chosen floor is outside that range.
- **Hover equations.** Any element with a `data-eq` attribute shows a tooltip with that text (new lines allowed). The `span(text, eq)` helper in `main.js` makes these.
- **Tabs.** Each rules section is a `section.band`. The links in `nav.hbnav` act as tabs, and `showTab()` shows one band at a time. Print shows every band except Calculators.
- **Calculators.** Your crawler, Check, Damage, Health & Mana and Dice each have a block in `main.js`. `calcRefresh()` redraws them all.

## How the character sheet link works

- **Linking.** In Chrome and Edge the page uses the File System Access API, so it can save straight into the PDF. The file handle is kept in IndexedDB so you can reconnect next visit. Other browsers open the file read-only: the change list shows what to update by hand, and saving needs Chrome or Edge.
- **Saving.** `pdf-engine.js` never rewrites the original bytes. Each save appends changed field objects, new appearance streams and a new cross-reference section to the end of the file, the same way Acrobat saves. Removing those appended bytes gets you the previous version.
- **Stats.** Each stat has an Unenhanced and an Enhanced value, matching the sheet. Changing Unenhanced moves Enhanced by the same amount, so gear and buff bonuses stay put; changing Enhanced alone only changes Enhanced. Both are saved.
- **Re-saved PDFs.** If a PDF program re-saves the sheet with compressed object streams, the engine decompresses them. It tolerates the bad checksums and stray bytes some programs leave behind, which strict browser decompression would otherwise reject with "Failed to fetch".
- **Edits made elsewhere.** The page checks the file every few seconds. If you changed it in your PDF reader, it reloads those numbers. Before every save it re-reads the file, so edits made elsewhere are kept.
- **Unsaved changes.** The list shows the difference between the numbers when you linked (or last saved) and now. Only fields that changed are written.

### Field map for `Carl_Character_Sheet_Fillable.pdf`

These are the field names the page reads and writes. They're set in the `FN` object in `main.js`.

| Sheet item | Field name |
| --- | --- |
| Name, Race, Class, Level, Floor, Crawler Number | `Name`, `Race`, `class`, `level`, `Floor`, `crawler number` |
| Strength Enhanced / Unenhanced / Mod | `Text Field 21` / `22` / `23` |
| Intelligence | `Text Field 34` / `35` / `36` |
| Constitution | `Text Field 43` / `44` / `45` |
| Dexterity | `Text Field 46` / `47` / `48` |
| Charisma | `Text Field 49` / `50` / `51` |
| Evade: Dex Mod, Buffs, Total | `Text Field 24`, `25`, `26` |
| DR: Armor, Buffs, Total | `Text Field 29`, `30`, `31` |
| AI Favor | `Text Field 32` |
| Max Mana, Current Mana | `Text Field 38`, `Text Field 37` |
| Debuffs, External Buffs 1 to 3 | `Text Field 39`, `40`, `41`, `42` |
| Health Bar slot values, 10% to 100% | `10`, `20`, … `100` |
| Health Bar damage boxes, 10% to 100% | `Check Box6 2`, `Check Box6 1`, `Check Box6 1 1` … `Check Box6 1 8` |
| Attacks, rows 1 to 5 (name, rank, to-hit stat, dice, damage stat) | `55, 551, 52, 53, 54` / `61, 57, 59, 58, 60` / `67, 63, 65, 64, 66` / `73, 69, 71, 70, 72` / `79, 75, 77, 76, 78` |
| Skills, row k from 0 to 19 (name, rank, stat, advancement box) | `Text Field 103+6k`, `104+6k`, `105+6k`, `Check Box k+1` |
| Popularity | `Text Field 98` |

This sheet stores every field twice: once on the page and once in the form's field list. The engine updates both. When they disagree, it reads the copy that's shown on the page.

## Testing

```
node tests/test-pdf-engine.js "C:\path\to\a copy of Carl_Character_Sheet_Fillable.pdf"
```

This reads the sheet, saves a few changes to `tests/out/roundtrip.pdf`, reopens it and checks them. The PDF you point at is never written.

```
npm install playwright
npx playwright install chromium
node tests/browser-test.js "C:\path\to\a copy of Carl_Character_Sheet_Fillable.pdf"
```

This loads the built page, opens the sheet read-only and checks that saving is off, then links it through a stand-in file handle, rolls a check, takes some damage, saves through the handle to `tests/out/saved.pdf`, and reports any page errors or downloads.

## Sources

Rules are summarised from the Dungeon Crawler Carl RPG Core Rulebook (Royal Court Edition), Rules for Survival, and Crawlers & Customization. Page references are on the page itself.

## Antivirus false positives

Some antivirus tools flag HTML files that build files in the browser and download them, or that run code from strings. That's how "HTML smuggling" malware works, so the page avoids both:

- It never creates a download. It only writes into a sheet you linked yourself, through the browser's file permission prompt.
- Floor formulas are parsed by a small pattern match instead of being run as code.
- No fonts or other files are embedded as encoded data.

Keep it that way when you edit `main.js`: no `new Blob` plus `createObjectURL` downloads, no `eval` or `new Function`, and no large base64 strings.

## Versions

Each release is tagged in git (`v1.0.0`, `v1.1.0` and so on). `CHANGELOG.md` lists what changed. Rebuild `dist/` with `python build.py` before committing a change to `src/`.
