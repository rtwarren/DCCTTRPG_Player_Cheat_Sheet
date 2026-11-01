# Change log

Versions of `dist/Crawler_Cheat_Sheet.html`. Each one is tagged in git (for example `v1.2.0`).

## 1.1.0 (2026-10-31)

- Windows Defender no longer flags the page. It used to build an updated PDF in the browser and download it, which looks like malware that smuggles files through web pages. The page now only saves into a sheet you linked.
- Saving needs Chrome or Edge. Firefox and Safari open the sheet read-only, and the change list shows what to update by hand.
- Floor formulas are parsed instead of being run as code.
- The heading font is no longer packed into the file. Windows uses its built-in Bahnschrift; other systems fall back to Arial Narrow.

## 1.0.0 (2026-10-31)

- First version: a one-file, offline player reference for the Dungeon Crawler Carl RPG.
- Ten rules sections in tabs, with floor-aware numbers and hover equations that show the maths and dice.
- Calculators for checks, damage, health and mana, and dice.
- Links the fillable character sheet PDF, tracks changes, and saves them back into the PDF.
