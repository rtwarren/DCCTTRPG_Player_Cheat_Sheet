// End-to-end test of the built page in Chromium. Needs: npm install playwright, then npx playwright install chromium
// Usage: node tests/browser-test.js "path/to/a COPY of Carl_Character_Sheet_Fillable.pdf"
// Links the sheet through the file picker fallback, makes changes, downloads the updated copy
// to tests/out/downloaded.pdf and reports any page errors.
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

(async () => {
  const sheet = process.argv[2];
  if (!sheet) { console.error("Give the path to a copy of the fillable sheet."); process.exit(1); }
  const page_ = "file://" + path.resolve(__dirname, "..", "dist", "Crawler_Cheat_Sheet.html");
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", e => errors.push(e.message));
  await p.goto(page_);
  const text = id => p.$eval("#" + id, e => e.textContent);
  await p.setInputFiles("#sb-file", sheet);
  await p.waitForTimeout(800);
  console.log("Linked:", await text("sb-who"));
  await p.selectOption("#ck-src", "s:0");
  await p.click('[data-preset="unopp"]');
  await p.click("#ck-roll");
  console.log("Check:", await text("ck-out"));
  await p.click("#tt-health");
  await p.fill("#hm-dmg", "3");
  await p.click("#hm-hit");
  console.log("Unsaved:", await p.$$eval("#sb-changes li", els => els.map(e => e.textContent)));
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#sb-save")]);
  fs.mkdirSync(path.join(__dirname, "out"), { recursive: true });
  await dl.saveAs(path.join(__dirname, "out", "downloaded.pdf"));
  console.log("Saved tests/out/downloaded.pdf");
  console.log(errors.length ? "Page errors: " + errors.join("; ") : "No page errors.");
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
